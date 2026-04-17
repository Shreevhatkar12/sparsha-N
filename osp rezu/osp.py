"""
=============================================================
  DINING PHILOSOPHERS PROBLEM
  B.Tech Computer Engineering — Operating Systems
  2nd Year, Semester 4 — Final Project
=============================================================

  Problem Statement:
  ------------------
  Five philosophers sit around a circular table. Each philosopher
  alternates between THINKING and EATING. Between every pair of
  adjacent philosophers lies a single fork. To eat, a philosopher
  must hold BOTH the left and right fork simultaneously.

  Without synchronization this leads to:
    - Deadlock  : all pick up left fork and wait forever for right.
    - Starvation: a philosopher may never get both forks.

  Algorithms Implemented:
  -----------------------
  1. Resource Hierarchy  — lower-numbered fork first (Dijkstra)
  2. Waiter (Semaphore)  — global semaphore limits concurrency to N-1
  3. Chandy–Misra        — token-based fork passing

  Architecture:
  -------------
  - Each philosopher runs in its own daemon Thread.
  - Forks are protected by threading.Lock objects.
  - The GUI (Tkinter Canvas) polls shared state every ~80 ms.
  - A threading.Event is used to start / stop the simulation.
=============================================================
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import random
import math
import queue

# ── Constants ────────────────────────────────────────────────
DEFAULT_PHILOSOPHERS = 5
MAX_PHILOSOPHERS = 20

def get_name(idx):
    return f"Philosopher {idx+1}"

BASE_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#a78bfa", "#f472b6", "#fb7185", "#38bdf8", "#34d399", "#a3e635", "#fbbf24", "#f87171", "#c084fc", "#818cf8", "#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa"]
def get_color(idx):
    return BASE_COLORS[idx % len(BASE_COLORS)]

# Timing ranges (seconds)
THINK_MIN, THINK_MAX = 0.5, 2.0
EAT_MIN,   EAT_MAX   = 0.4, 1.5

# Colours
COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa"]
STATE_COLOR = {
    "thinking": "#9ca3af",
    "waiting":  "#f59e0b",
    "eating":   "#22c55e",
}
CANVAS_BG   = "#1e1e1e"
TABLE_FILL  = "#2a2a28"
TABLE_RING  = "#444442"
FORK_IDLE   = "#6b7280"
FORK_HELD   = "#818cf8"


# ═══════════════════════════════════════════════════════════════
#  CORE LOGIC — philosopher threads & synchronization
# ═══════════════════════════════════════════════════════════════

class PhilosopherState:
    """Shared mutable state for one philosopher (thread-safe reads via GIL)."""
    def __init__(self, idx: int):
        self.idx     = idx
        self.name    = get_name(idx)
        self.state   = "thinking"   # "thinking" | "waiting" | "eating"
        self.meals   = 0
        self.total_wait = 0.0       # cumulative seconds spent waiting


class DiningSimulation:
    """
    Manages philosopher threads and fork locks.

    Attributes
    ----------
    forks : list[threading.Lock]
        One lock per fork; fork i sits between philosopher i and (i+1)%N.
    phil_states : list[PhilosopherState]
        Shared state array polled by the GUI.
    stop_event : threading.Event
        Signals all threads to terminate cleanly.
    log_queue : queue.Queue
        Thread-safe log message pipe to the GUI.
    algorithm : str
        One of "resource" | "waiter" | "chandy".
    """

    def __init__(self, algorithm: str = "resource", num_philosophers: int = DEFAULT_PHILOSOPHERS):
        self.algorithm   = algorithm
        self.num_philosophers = num_philosophers
        self.forks       = [threading.Lock() for _ in range(num_philosophers)]
        self.phil_states = [PhilosopherState(i) for i in range(num_philosophers)]
        self.stop_event  = threading.Event()
        self.log_queue   = queue.Queue(maxsize=200)

        # Waiter semaphore — allows at most N-1 philosophers to compete at once
        self.waiter_sem  = threading.Semaphore(max(1, num_philosophers - 1))

    # ── Logging ───────────────────────────────────────────────
    def log(self, msg: str):
        ts = time.strftime("%H:%M:%S")
        try:
            self.log_queue.put_nowait(f"[{ts}] {msg}")
        except queue.Full:
            pass

    # ── Thread entry point ────────────────────────────────────
    def run_philosopher(self, idx: int):
        """Main loop for philosopher idx. Runs until stop_event is set."""
        dispatch = {
            "resource": self._cycle_resource_hierarchy,
            "waiter":   self._cycle_waiter,
            "chandy":   self._cycle_chandy,
        }
        cycle_fn = dispatch.get(self.algorithm, self._cycle_resource_hierarchy)

        ps = self.phil_states[idx]
        while not self.stop_event.is_set():
            # ── THINK ──
            ps.state = "thinking"
            self.log(f"{ps.name} is thinking…")
            self._interruptible_sleep(random.uniform(THINK_MIN, THINK_MAX))
            if self.stop_event.is_set():
                break

            # ── TRY TO EAT (algorithm-specific) ──
            cycle_fn(idx)

    # ── Algorithm 1: Resource Hierarchy (Dijkstra, 1971) ──────
    def _cycle_resource_hierarchy(self, idx: int):
        """
        Always acquire the lower-numbered fork first.
        This breaks the circular-wait condition, preventing deadlock.

        Fork indices:  left = (idx-1) % N,  right = idx
        We pick  lo = min(left, right),  hi = max(left, right).
        """
        ps = self.phil_states[idx]
        left  = (idx - 1) % self.num_philosophers
        right = idx
        lo, hi = min(left, right), max(left, right)

        ps.state = "waiting"
        t_start = time.time()
        self.log(f"{ps.name} waiting for forks (F{lo+1} then F{hi+1})")

        self.forks[lo].acquire()
        if self.stop_event.is_set():
            self.forks[lo].release()
            return
        self.forks[hi].acquire()

        # ── EAT ──
        ps.total_wait += time.time() - t_start
        ps.state  = "eating"
        ps.meals += 1
        self.log(f"{ps.name} is eating (meal #{ps.meals})")
        self._interruptible_sleep(random.uniform(EAT_MIN, EAT_MAX))

        self.forks[hi].release()
        self.forks[lo].release()
        self.log(f"{ps.name} finished eating, put down forks")

    # ── Algorithm 2: Waiter / Global Semaphore ────────────────
    def _cycle_waiter(self, idx: int):
        """
        A virtual 'waiter' allows only N-1 philosophers to attempt
        to pick up forks at the same time, preventing deadlock.
        """
        ps = self.phil_states[idx]
        left  = (idx - 1) % self.num_philosophers
        right = idx

        ps.state = "waiting"
        t_start = time.time()
        self.log(f"{ps.name} asking waiter for permission")

        self.waiter_sem.acquire()          # ← at most N-1 pass this gate
        if self.stop_event.is_set():
            self.waiter_sem.release()
            return

        self.forks[left].acquire()
        if self.stop_event.is_set():
            self.forks[left].release()
            self.waiter_sem.release()
            return
        self.forks[right].acquire()

        # ── EAT ──
        ps.total_wait += time.time() - t_start
        ps.state  = "eating"
        ps.meals += 1
        self.log(f"{ps.name} is eating (meal #{ps.meals})")
        self._interruptible_sleep(random.uniform(EAT_MIN, EAT_MAX))

        self.forks[right].release()
        self.forks[left].release()
        self.waiter_sem.release()          # ← return permission to waiter
        self.log(f"{ps.name} finished eating, released forks")

    # ── Algorithm 3: Chandy–Misra (simplified token passing) ──
    def _cycle_chandy(self, idx: int):
        """
        Simplified Chandy–Misra: philosophers pass fork ownership
        on request. Uses a condition variable to avoid busy-waiting.
        (Full Chandy–Misra uses per-philosopher channels; this
        version approximates the fairness using a shared condition.)
        """
        ps = self.phil_states[idx]
        left  = (idx - 1) % self.num_philosophers
        right = idx

        ps.state = "waiting"
        t_start = time.time()
        self.log(f"{ps.name} requesting both forks (Chandy–Misra)")

        # Attempt to acquire both; back off randomly if only one available
        acquired = False
        while not acquired and not self.stop_event.is_set():
            got_left = self.forks[left].acquire(timeout=0.1)
            if got_left:
                got_right = self.forks[right].acquire(timeout=0.1)
                if got_right:
                    acquired = True
                else:
                    self.forks[left].release()
                    time.sleep(random.uniform(0.05, 0.2))  # back-off
            else:
                time.sleep(random.uniform(0.05, 0.2))

        if not acquired:
            return

        # ── EAT ──
        ps.total_wait += time.time() - t_start
        ps.state  = "eating"
        ps.meals += 1
        self.log(f"{ps.name} is eating (meal #{ps.meals})")
        self._interruptible_sleep(random.uniform(EAT_MIN, EAT_MAX))

        self.forks[right].release()
        self.forks[left].release()
        self.log(f"{ps.name} finished, forks passed back")

    # ── Helpers ───────────────────────────────────────────────
    def _interruptible_sleep(self, duration: float):
        """Sleep in small chunks so stop_event is checked frequently."""
        end = time.time() + duration
        while time.time() < end and not self.stop_event.is_set():
            time.sleep(0.05)

    def start(self):
        """Spawn one daemon thread per philosopher."""
        self.stop_event.clear()
        self._threads = []
        for i in range(self.num_philosophers):
            t = threading.Thread(
                target=self.run_philosopher,
                args=(i,),
                daemon=True,
                name=f"Phil-{get_name(i)}"
            )
            t.start()
            self._threads.append(t)

    def stop(self):
        """Signal all threads to stop (they check stop_event themselves)."""
        self.stop_event.set()
        # Release any blocked locks so threads can unblock and check stop_event
        for lock in self.forks:
            try:
                lock.release()
            except RuntimeError:
                pass   # already unlocked — that's fine


# ═══════════════════════════════════════════════════════════════
#  GUI — Tkinter
# ═══════════════════════════════════════════════════════════════

class DiningGUI:
    """
    Tkinter GUI for the Dining Philosophers simulation.

    Layout:
      - Top bar    : title + algorithm selector + speed slider
      - Canvas     : circular table with philosophers and forks
      - Stats row  : eating / waiting / thinking counts + total meals
      - Log panel  : scrolled text showing timestamped events
      - Bottom bar : Start / Pause / Reset buttons
    """

    CANVAS_SIZE = 460
    CX = CY = 230          # centre of table
    R_TABLE   = 90
    R_PHIL    = 140
    R_FORK    = 112

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Dining Philosophers — OS Project")
        self.root.configure(bg="#111110")
        self.root.resizable(True, True)
        
        self.is_fullscreen = False
        self.root.bind("<F11>", self.toggle_fullscreen)
        self.root.bind("<Escape>", self.end_fullscreen)

        self.sim: DiningSimulation | None = None
        self.running  = False
        self.paused   = False
        self._speed   = 3           # 1–5
        self._after_id = None
        self.num_philosophers = DEFAULT_PHILOSOPHERS

        self._build_ui()
        self._draw_idle()

    def toggle_fullscreen(self, event=None):
        self.is_fullscreen = not self.is_fullscreen
        self.root.attributes("-fullscreen", self.is_fullscreen)

    def end_fullscreen(self, event=None):
        self.is_fullscreen = False
        self.root.attributes("-fullscreen", False)

    # ── UI Construction ───────────────────────────────────────
    def _build_ui(self):
        PAD = {"padx": 10, "pady": 6}

        # Create main 2-column container
        main_container = tk.Frame(self.root, bg="#111110")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Configure columns for 7:3 ratio
        main_container.columnconfigure(0, weight=7)
        main_container.columnconfigure(1, weight=3)
        main_container.rowconfigure(0, weight=1)

        left_col = tk.Frame(main_container, bg="#111110")
        left_col.grid(row=0, column=0, sticky="nsew", padx=(0, 10))

        right_col = tk.Frame(main_container, bg="#111110")
        right_col.grid(row=0, column=1, sticky="nsew", padx=(10, 0))

        # ── Top bar ──
        top = tk.Frame(left_col, bg="#111110")
        top.pack(fill="x", **PAD)

        tk.Label(top, text="Dining Philosophers Problem",
                 fg="#e5e4dc", bg="#111110",
                 font=("Helvetica", 15, "bold")).pack(side="left")

        tk.Label(top, text="OS Sem 4", fg="#60a5fa",
                 bg="#2a3a50", font=("Helvetica", 10),
                 padx=6, pady=2).pack(side="left", padx=10)

        # Algorithm selector (right-aligned)
        algo_frame = tk.Frame(top, bg="#111110")
        algo_frame.pack(side="right")
        tk.Label(algo_frame, text="Algorithm:", fg="#9ca3af",
                 bg="#111110", font=("Helvetica", 11)).pack(side="left")
        self.algo_var = tk.StringVar(value="resource")
        self.algo_menu = ttk.Combobox(
            algo_frame, textvariable=self.algo_var, state="readonly",
            values=["resource", "waiter", "chandy"], width=14,
            font=("Helvetica", 11)
        )
        self.algo_menu.pack(side="left", padx=(4, 0))

        # ── Canvas ──
        self.canvas = tk.Canvas(
            left_col, width=self.CANVAS_SIZE, height=self.CANVAS_SIZE,
            bg=CANVAS_BG, highlightthickness=0
        )
        self.canvas.pack(padx=10)

        # ── Stats row ──
        stats_frame = tk.Frame(left_col, bg="#111110")
        stats_frame.pack(fill="x", padx=10, pady=(4, 0))
        self.stat_labels = {}
        for key, label, color in [
            ("eating",   "Eating",      "#22c55e"),
            ("waiting",  "Waiting",     "#f59e0b"),
            ("thinking", "Thinking",    "#9ca3af"),
            ("meals",    "Total meals", "#e5e4dc"),
            ("total_wait", "Wait Time", "#f472b6"),
            ("avg_wait", "Wait/Meal", "#a78bfa"),
        ]:
            box = tk.Frame(stats_frame, bg="#1e1e1c",
                           bd=0, relief="flat", padx=14, pady=6)
            box.pack(side="left", expand=True, fill="x", padx=4)
            val_lbl = tk.Label(box, text="0", fg=color, bg="#1e1e1c",
                               font=("Helvetica", 20, "bold"))
            val_lbl.pack()
            tk.Label(box, text=label, fg="#6b6b68",
                     bg="#1e1e1c", font=("Helvetica", 10)).pack()
            self.stat_labels[key] = val_lbl

        # ── Per-philosopher state table ──
        table_container = tk.Frame(left_col, bg="#111110")
        table_container.pack(fill="both", expand=True, padx=10, pady=(8, 0))
        
        table_scroll = tk.Scrollbar(table_container, orient="vertical")
        table_scroll.pack(side="right", fill="y")
        
        self.table_canvas = tk.Canvas(table_container, bg="#111110", highlightthickness=0, yscrollcommand=table_scroll.set)
        self.table_canvas.pack(side="left", fill="both", expand=True)
        table_scroll.config(command=self.table_canvas.yview)
        
        self.table_frame = tk.Frame(self.table_canvas, bg="#111110")
        self.table_window_id = self.table_canvas.create_window((0, 0), window=self.table_frame, anchor="nw")
        
        self.table_frame.bind("<Configure>", lambda e: self.table_canvas.configure(scrollregion=self.table_canvas.bbox("all")))
        self.table_canvas.bind("<Configure>", lambda e: self.table_canvas.itemconfig(self.table_window_id, width=e.width))

        self._phil_rows = []
        headers = ["Philosopher", "State", "Meals", "Wait (s)"]
        for c, h in enumerate(headers):
            tk.Label(self.table_frame, text=h, fg="#6b6b68",
                     bg="#111110", font=("Helvetica", 10, "bold"),
                     width=14, anchor="w").grid(row=0, column=c, padx=4)
        for i in range(self.num_philosophers):
            row_labels = []
            for c in range(4):
                lbl = tk.Label(self.table_frame, text="—", fg="#e5e4dc",
                               bg="#111110", font=("Helvetica", 10),
                               width=14, anchor="w")
                lbl.grid(row=i+1, column=c, padx=4, pady=1)
                row_labels.append(lbl)
            self._phil_rows.append(row_labels)
        self._update_phil_table_static()

        # ── Bottom controls ──
        btn_frame = tk.Frame(left_col, bg="#111110")
        btn_frame.pack(fill="x", padx=10, pady=10)

        self.btn_start = tk.Button(
            btn_frame, text="▶  Start", command=self._on_start,
            bg="#1d4ed8", fg="#fff", font=("Helvetica", 11, "bold"),
            relief="flat", padx=16, pady=6, cursor="hand2"
        )
        self.btn_start.pack(side="left", padx=(0, 6))

        self.btn_pause = tk.Button(
            btn_frame, text="⏸  Pause", command=self._on_pause,
            bg="#2d2d2b", fg="#9ca3af", font=("Helvetica", 11),
            relief="flat", padx=16, pady=6, state="disabled", cursor="hand2"
        )
        self.btn_pause.pack(side="left", padx=6)

        self.btn_reset = tk.Button(
            btn_frame, text="↺  Reset", command=self._on_reset,
            bg="#3b1212", fg="#f87171", font=("Helvetica", 11),
            relief="flat", padx=16, pady=6, cursor="hand2"
        )
        self.btn_reset.pack(side="left", padx=6)

        # Speed slider
        tk.Label(btn_frame, text="Speed:", fg="#9ca3af",
                 bg="#111110", font=("Helvetica", 10)).pack(side="right", padx=(0, 4))
        self.speed_var = tk.IntVar(value=3)
        tk.Scale(
            btn_frame, variable=self.speed_var, from_=1, to=5,
            orient="horizontal", length=60, bg="#111110", fg="#9ca3af",
            highlightthickness=0, troughcolor="#2d2d2b",
            showvalue=True, font=("Helvetica", 9)
        ).pack(side="right", padx=4)

        # Philosophers slider
        tk.Label(btn_frame, text="2-20 philosophers:", fg="#9ca3af",
                 bg="#111110", font=("Helvetica", 10)).pack(side="right", padx=(0, 4))
        self.num_phil_var = tk.IntVar(value=DEFAULT_PHILOSOPHERS)
        tk.Scale(
            btn_frame, variable=self.num_phil_var, from_=2, to=MAX_PHILOSOPHERS,
            orient="horizontal", length=90, bg="#111110", fg="#9ca3af",
            highlightthickness=0, troughcolor="#2d2d2b",
            showvalue=True, font=("Helvetica", 9),
            command=self._on_num_phil_change
        ).pack(side="right", padx=4)

        # ── Log panel (Right Column) ──
        log_frame = tk.Frame(right_col, bg="#111110")
        log_frame.pack(fill="both", expand=True)
        tk.Label(log_frame, text="Event Log", fg="#6b6b68",
                 bg="#111110", font=("Helvetica", 10, "bold"),
                 anchor="w").pack(fill="x")
        self.log_text = tk.Text(
            log_frame, bg="#0d0d0c", fg="#9ca3af",
            font=("Courier", 10), state="disabled",
            relief="flat", bd=0, padx=6, pady=4,
            wrap="word"
        )
        scroll = tk.Scrollbar(log_frame, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=scroll.set)
        scroll.pack(side="right", fill="y")
        self.log_text.pack(fill="both", expand=True)
        # Colour tags for log
        self.log_text.tag_config("eat",  foreground="#22c55e")
        self.log_text.tag_config("wait", foreground="#f59e0b")
        self.log_text.tag_config("info", foreground="#9ca3af")

    # ── Initial static table fill ─────────────────────────────
    def _update_phil_table_static(self):
        for i, row in enumerate(self._phil_rows):
            row[0].config(text=get_name(i), fg=get_color(i))
            row[1].config(text="thinking", fg=STATE_COLOR["thinking"])
            row[2].config(text="0")
            row[3].config(text="0.00")

    def _on_num_phil_change(self, val):
        if not self.running:
            self.num_philosophers = int(val)
            self._update_table_ui()
            self._draw_idle()

    def _update_table_ui(self):
        for row in self._phil_rows:
            for lbl in row:
                lbl.destroy()
        self._phil_rows = []
        for i in range(self.num_philosophers):
            row_labels = []
            for c in range(4):
                lbl = tk.Label(self.table_frame, text="—", fg="#e5e4dc",
                               bg="#111110", font=("Helvetica", 10),
                               width=14, anchor="w")
                lbl.grid(row=i+1, column=c, padx=4, pady=1)
                row_labels.append(lbl)
            self._phil_rows.append(row_labels)
        self._update_phil_table_static()

    # ── Button handlers ───────────────────────────────────────
    def _on_start(self):
        if self.running and not self.paused:
            return
        if not self.running:
            algo = self.algo_var.get()
            self.sim = DiningSimulation(algorithm=algo, num_philosophers=self.num_philosophers)
            self.sim.start()
            self._append_log(f"Started — algorithm: {algo}", "info")
        self.running = True
        self.paused  = False
        self.btn_start.config(state="disabled")
        self.btn_pause.config(state="normal", text="⏸  Pause")
        self.algo_menu.config(state="disabled")
        self._schedule_poll()

    def _on_pause(self):
        if not self.running:
            return
        self.paused = not self.paused
        if self.paused:
            if self._after_id:
                self.root.after_cancel(self._after_id)
                self._after_id = None
            self.btn_pause.config(text="▶  Resume")
            self._append_log("Simulation paused", "info")
        else:
            self.btn_pause.config(text="⏸  Pause")
            self._append_log("Simulation resumed", "info")
            self._schedule_poll()

    def _on_reset(self):
        if self._after_id:
            self.root.after_cancel(self._after_id)
            self._after_id = None
        if self.sim:
            self.sim.stop()
            self.sim = None
        self.running = False
        self.paused  = False
        self.btn_start.config(state="normal")
        self.btn_pause.config(state="disabled", text="⏸  Pause")
        self.algo_menu.config(state="readonly")
        self.num_phil_var.set(self.num_philosophers)
        self._update_stats_idle()
        self._update_phil_table_static()
        self._draw_idle()
        self._append_log("Reset.", "info")

    # ── Polling loop ──────────────────────────────────────────
    def _schedule_poll(self):
        interval_ms = [200, 150, 100, 70, 40][self.speed_var.get() - 1]
        self._after_id = self.root.after(interval_ms, self._poll)

    def _poll(self):
        """Called by Tkinter every ~N ms to refresh the GUI from sim state."""
        if not self.running or self.paused or self.sim is None:
            return
        # Drain log queue
        while True:
            try:
                msg = self.sim.log_queue.get_nowait()
                tag = "eat" if "eating" in msg else "wait" if "waiting" in msg else "info"
                self._append_log(msg, tag)
            except queue.Empty:
                break
        # Redraw
        self._draw_state()
        self._update_stats()
        self._update_phil_table()
        self._schedule_poll()

    # ── Canvas drawing ────────────────────────────────────────
    def _draw_idle(self):
        """Draw the table without any live state."""
        c = self.canvas
        c.delete("all")
        # Table
        c.create_oval(
            self.CX-self.R_TABLE, self.CY-self.R_TABLE,
            self.CX+self.R_TABLE, self.CY+self.R_TABLE,
            fill=TABLE_FILL, outline=TABLE_RING, width=3
        )
        c.create_text(self.CX, self.CY-10, text="Round Table",
                      fill="#555553", font=("Helvetica", 11))
        c.create_text(self.CX, self.CY+10, text=f"{self.num_philosophers} Philosophers",
                      fill="#444442", font=("Helvetica", 10))
        # Forks
        for i in range(self.num_philosophers):
            ang = (i / self.num_philosophers) * 2 * math.pi - math.pi/2 + math.pi/self.num_philosophers
            fx  = self.CX + self.R_FORK * math.cos(ang)
            fy  = self.CY + self.R_FORK * math.sin(ang)
            r = 9
            c.create_oval(fx-r, fy-r, fx+r, fy+r,
                          fill=FORK_IDLE, outline="#fff", width=1)
            c.create_text(fx, fy, text=f"F{i+1}",
                          fill="#e5e4dc", font=("Helvetica", 8, "bold"))
        # Philosophers
        for i in range(self.num_philosophers):
            ang = (i / self.num_philosophers) * 2 * math.pi - math.pi/2
            px  = self.CX + self.R_PHIL * math.cos(ang)
            py  = self.CY + self.R_PHIL * math.sin(ang)
            r   = 22
            c.create_oval(px-r, py-r, px+r, py+r,
                          fill=get_color(i), outline=STATE_COLOR["thinking"], width=2)
            c.create_text(px, py, text=get_name(i)[0],
                          fill="#fff", font=("Helvetica", 11, "bold"))
            lx = self.CX + (self.R_PHIL + 34) * math.cos(ang)
            ly = self.CY + (self.R_PHIL + 34) * math.sin(ang)
            c.create_text(lx, ly, text=f"P{i+1}",
                          fill="#9ca3af", font=("Helvetica", 10))

    def _draw_state(self):
        """Redraw canvas from current simulation state."""
        if self.sim is None:
            return
        c = self.canvas
        c.delete("all")

        # Determine fork holder
        fork_holder = [-1] * self.num_philosophers  # fork i held by whom
        # Heuristic: if a philosopher is eating, they hold their two forks
        for ps in self.sim.phil_states:
            if ps.state == "eating":
                left  = (ps.idx - 1) % self.num_philosophers
                right = ps.idx
                fork_holder[left]  = ps.idx
                fork_holder[right] = ps.idx

        # Table
        c.create_oval(
            self.CX-self.R_TABLE, self.CY-self.R_TABLE,
            self.CX+self.R_TABLE, self.CY+self.R_TABLE,
            fill=TABLE_FILL, outline=TABLE_RING, width=3
        )
        c.create_text(self.CX, self.CY-10, text="Round Table",
                      fill="#555553", font=("Helvetica", 11))
        c.create_text(self.CX, self.CY+10,
                      text=f"{self.num_philosophers} Philosophers",
                      fill="#444442", font=("Helvetica", 10))

        # Forks
        for i in range(self.num_philosophers):
            ang  = (i / self.num_philosophers) * 2*math.pi - math.pi/2 + math.pi/self.num_philosophers
            fx   = self.CX + self.R_FORK * math.cos(ang)
            fy   = self.CY + self.R_FORK * math.sin(ang)
            r    = 9
            col  = FORK_HELD if fork_holder[i] >= 0 else FORK_IDLE
            c.create_oval(fx-r, fy-r, fx+r, fy+r,
                          fill=col, outline="#fff", width=1)
            c.create_text(fx, fy, text=f"F{i+1}",
                          fill="#fff", font=("Helvetica", 8, "bold"))

        # Philosophers
        for ps in self.sim.phil_states:
            ang = (ps.idx / self.num_philosophers) * 2*math.pi - math.pi/2
            px  = self.CX + self.R_PHIL * math.cos(ang)
            py  = self.CY + self.R_PHIL * math.sin(ang)
            r   = 22
            ring = STATE_COLOR[ps.state]

            # Glow for eating
            if ps.state == "eating":
                c.create_oval(px-r-6, py-r-6, px+r+6, py+r+6,
                              fill="", outline=ring, width=2, dash=(4, 3))

            c.create_oval(px-r, py-r, px+r, py+r,
                          fill=get_color(ps.idx), outline=ring, width=3)
            c.create_text(px, py, text=get_name(ps.idx)[0],
                          fill="#fff", font=("Helvetica", 11, "bold"))

            # State indicator dot (top-right of circle)
            dx, dy = px + r*0.6, py - r*0.6
            c.create_oval(dx-6, dy-6, dx+6, dy+6,
                          fill=ring, outline="#1e1e1e", width=1)

            # Labels
            lx = self.CX + (self.R_PHIL + 34) * math.cos(ang)
            ly = self.CY + (self.R_PHIL + 34) * math.sin(ang)
            c.create_text(lx, ly, text=f"P{ps.idx+1}",
                          fill="#d1d0c6", font=("Helvetica", 10))
            c.create_text(lx, ly+14, text=f"×{ps.meals}",
                          fill=ring, font=("Helvetica", 9, "bold"))

    # ── Stats & table updates ─────────────────────────────────
    def _update_stats(self):
        if self.sim is None:
            return
        counts = {"eating": 0, "waiting": 0, "thinking": 0, "meals": 0, "total_wait": 0.0}
        for ps in self.sim.phil_states:
            counts[ps.state] += 1
            counts["meals"]  += ps.meals
            counts["total_wait"] += ps.total_wait
        if counts["meals"] > 0:
            counts["avg_wait"] = counts["total_wait"] / counts["meals"]
        else:
            counts["avg_wait"] = 0.0

        for key, lbl in self.stat_labels.items():
            if key in ["total_wait", "avg_wait"]:
                lbl.config(text=f"{counts[key]:.1f}s")
            else:
                lbl.config(text=str(counts[key]))

    def _update_stats_idle(self):
        for lbl in self.stat_labels.values():
            lbl.config(text="0")

    def _update_phil_table(self):
        if self.sim is None:
            return
        for ps in self.sim.phil_states:
            row = self._phil_rows[ps.idx]
            row[0].config(text=get_name(ps.idx), fg=get_color(ps.idx))
            row[1].config(text=ps.state, fg=STATE_COLOR[ps.state])
            row[2].config(text=str(ps.meals))
            row[3].config(text=f"{ps.total_wait:.1f}s")

    # ── Log helper ────────────────────────────────────────────
    def _append_log(self, msg: str, tag: str = "info"):
        self.log_text.config(state="normal")
        self.log_text.insert("end", msg + "\n", tag)
        self.log_text.see("end")
        # Keep log from growing unbounded
        lines = int(self.log_text.index("end-1c").split(".")[0])
        if lines > 300:
            self.log_text.delete("1.0", "100.0")
        self.log_text.config(state="disabled")

    # ── Cleanup on window close ───────────────────────────────
    def on_closing(self):
        if self.sim:
            self.sim.stop()
        self.root.destroy()


# ═══════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════

def main():
    root = tk.Tk()
    app  = DiningGUI(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()


if __name__ == "__main__":
    main()