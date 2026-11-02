import React, { useEffect, useRef, useState } from "react";

export interface MultiOption {
  value: string;
  label: string;
}

// Small checkbox dropdown — empty selection means "All".
export const MultiSelect: React.FC<{
  options: MultiOption[];
  value: string[];
  onChange: (v: string[]) => void;
}> = ({ options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const text =
    value.length === 0
      ? "All"
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label ?? "1 selected"
        : `${value.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 rounded-lg border border-neutral-300 px-2 text-sm bg-white text-left truncate"
      >
        {text}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full min-w-[180px] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-xs font-bold text-neutral-500 hover:bg-neutral-50"
            onClick={() => onChange([])}
          >
            Clear (All)
          </button>
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-50">
              <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
