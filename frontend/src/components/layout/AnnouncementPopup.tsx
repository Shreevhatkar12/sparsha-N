import React, { useEffect, useState } from 'react';
import { Megaphone, Pin } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/date';

interface Ann {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
}

// Per-user "seen" memory so a dismissed announcement never pops again on
// this device. Server-side targeting already decides WHO receives it.
const seenKey = (uid: string) => `sparsha_ann_seen_${uid}`;
const getSeen = (uid: string): string[] => {
  try {
    const raw = localStorage.getItem(seenKey(uid));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const addSeen = (uid: string, ids: string[]) => {
  try {
    const merged = Array.from(new Set([...getSeen(uid), ...ids]));
    localStorage.setItem(seenKey(uid), JSON.stringify(merged.slice(-500)));
  } catch {
    /* storage unavailable — popup will simply show again next time */
  }
};

// Alert-style popup: unread announcements open in a modal the user must
// acknowledge — koni ignore karu shakat nahi. 📢
export const AnnouncementPopup: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [unseen, setUnseen] = useState<Ann[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    // Admins are the posters — no popup for them.
    if (currentUser.role === 'super_admin' || currentUser.role === 'tech_admin') return;
    let alive = true;
    api
      .get('/announcements')
      .then((res) => {
        if (!alive) return;
        const list: Ann[] = Array.isArray(res.data) ? res.data : [];
        const seen = new Set(getSeen(currentUser.id));
        setUnseen(list.filter((a) => !seen.has(a.id)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [currentUser]);

  if (!currentUser || unseen.length === 0) return null;

  const dismiss = () => {
    addSeen(currentUser.id, unseen.map((a) => a.id));
    setUnseen([]);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-neutral-900/70 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-brand-600 text-white">
          <span className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center animate-pulse">
            <Megaphone size={20} />
          </span>
          <div>
            <h3 className="text-base font-black tracking-wide">
              {unseen.length === 1 ? 'New Announcement' : `${unseen.length} New Announcements`}
            </h3>
            <p className="text-[11px] text-white/80">SPARSHA System — important update</p>
          </div>
        </div>

        {/* announcements */}
        <div className="max-h-[55vh] overflow-y-auto divide-y divide-neutral-100">
          {unseen.map((a) => (
            <div key={a.id} className="px-6 py-4">
              <div className="flex items-center gap-2">
                {a.isPinned && <Pin size={14} className="text-brand-600 shrink-0" />}
                <h4 className="font-bold text-neutral-900">{a.title}</h4>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {formatDate(new Date(a.createdAt), 'MMM d, yyyy • h:mm a')}
              </p>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed mt-2">{a.body}</p>
            </div>
          ))}
        </div>

        {/* acknowledge */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50">
          <Button variant="primary" className="w-full" onClick={dismiss}>
            OK, Got it ✓
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
