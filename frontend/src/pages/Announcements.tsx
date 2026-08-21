import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Megaphone, Plus, Bell, Pin, Clock, Target } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatDate } from '../utils/date';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { listCenters, listPrograms } from '../services/centers.service';
import type { CenterSummary, ProgramSummary } from '../types';

interface Announcement {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  expiresAt: string | null;
  targetRoles: string[];
}

// Targeting tokens live inside targetRoles: 'center:<id>' / 'program:<id>'.
const parseTargets = (tokens: string[] | null | undefined) => {
  const centers: string[] = [];
  const programs: string[] = [];
  const roles: string[] = [];
  for (const t of tokens ?? []) {
    if (t.startsWith('center:')) centers.push(t.slice(7));
    else if (t.startsWith('program:')) programs.push(t.slice(8));
    else roles.push(t);
  }
  return { centers, programs, roles };
};

export const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentUser } = useAuthStore();

  const [centers, setCenters] = useState<CenterSummary[]>([]);
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);

  const [formData, setFormData] = useState({ id: '', title: '', body: '', isPinned: false });
  const [selCenters, setSelCenters] = useState<string[]>([]);
  const [selPrograms, setSelPrograms] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  const isManagement = ['super_admin', 'center_admin', 'tech_admin'].includes(currentUser?.role || '');

  useEffect(() => {
    fetchAnnouncements();
    // Names are needed for the "Visible to" badges too, so load for everyone.
    listCenters().then((res) => setCenters(Array.isArray(res) ? res : [])).catch(() => {});
    listPrograms().then((res) => setPrograms(Array.isArray(res) ? res : [])).catch(() => {});
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const centerName = (id: string) => centers.find((c) => c.id === id)?.name || 'Center';
  const programName = (id: string) => programs.find((p) => p.id === id)?.name || 'Program';

  const openCreate = () => {
    setFormData({ id: '', title: '', body: '', isPinned: false });
    setSelCenters([]);
    setSelPrograms([]);
    setIsModalOpen(true);
  };

  const handleEdit = (a: Announcement) => {
    const { centers: tc, programs: tp } = parseTargets(a.targetRoles);
    setFormData({ id: a.id, title: a.title, body: a.body, isPinned: a.isPinned });
    setSelCenters(tc);
    setSelPrograms(tp);
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokens = [
      ...selCenters.map((c) => `center:${c}`),
      ...selPrograms.map((p) => `program:${p}`),
    ];
    setPosting(true);
    try {
      if (formData.id) {
        await api.put(`/announcements/${formData.id}`, {
          title: formData.title,
          body: formData.body,
          targetRoles: tokens,
          isPinned: formData.isPinned,
        });
      } else {
        await api.post('/announcements', {
          title: formData.title,
          body: formData.body,
          targetRoles: tokens,
          isPinned: formData.isPinned,
        });
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const chipCls = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
      active
        ? 'bg-brand-500 text-white border-brand-500'
        : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
    }`;

  const targetBadges = (a: Announcement) => {
    const { centers: tc, programs: tp, roles } = parseTargets(a.targetRoles);
    if (tc.length === 0 && tp.length === 0 && roles.length === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-100">
          Everyone
        </span>
      );
    }
    return (
      <>
        {tc.map((id) => (
          <span key={`c-${id}`} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-100">
            🏢 {centerName(id)}
          </span>
        ))}
        {tp.map((id) => (
          <span key={`p-${id}`} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
            📘 {programName(id)}
          </span>
        ))}
        {roles.map((r) => (
          <span key={`r-${r}`} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200 capitalize">
            {r.replace(/_/g, ' ')}
          </span>
        ))}
      </>
    );
  };

  if (loading) return <PageWrapper title="Announcements"><LoadingSpinner /></PageWrapper>;

  return (
    <PageWrapper title="Announcements">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Megaphone className="text-primary" />
            System Announcements
          </h1>
          <p className="text-neutral-500">Stay updated with the latest news and notifications</p>
        </div>
        {isManagement && (
          <Button variant="primary" className="flex items-center gap-2" onClick={openCreate}>
            <Plus size={18} />
            Post New Announcement
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 mx-auto mb-4">
              <Bell size={32} />
            </div>
            <h3 className="text-lg font-medium text-neutral-900">No active announcements</h3>
            <p className="text-neutral-500 mt-1">Check back later for system updates or news.</p>
          </Card>
        ) : (
          announcements.map((a) => (
            <Card key={a.id} className={`p-6 transition-all hover:shadow-md ${a.isPinned ? 'border-l-4 border-l-primary' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  {a.isPinned && <Pin size={16} className="text-primary mt-1" />}
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">{a.title}</h2>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(new Date(a.createdAt), 'MMM d, yyyy • h:mm a')}
                      </span>
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Target size={12} /> Visible to:
                      </span>
                      <span className="flex items-center gap-1.5 flex-wrap">{targetBadges(a)}</span>
                    </div>
                  </div>
                </div>
                {isManagement && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-brand-600 px-2" onClick={() => handleEdit(a)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-red-600 px-2" onClick={() => handleDelete(a.id)}>Delete</Button>
                  </div>
                )}
              </div>
              <div className="text-neutral-700 whitespace-pre-wrap leading-relaxed">{a.body}</div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? 'Edit Announcement' : 'Post Announcement'}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="E.g., Holiday Notice, New Policy..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Content</label>
            <textarea
              required
              rows={4}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Enter announcement details..."
            />
          </div>

          {/* Center targeting — multi-select */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Target Centers <span className="text-xs text-neutral-400">(none selected = all centers)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setSelCenters([])} className={chipCls(selCenters.length === 0)}>
                All Centers
              </button>
              {centers.map((c) => (
                <button key={c.id} type="button" onClick={() => toggle(selCenters, setSelCenters, c.id)} className={chipCls(selCenters.includes(c.id))}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Program targeting — multi-select */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Target Programs <span className="text-xs text-neutral-400">(none selected = all programs)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setSelPrograms([])} className={chipCls(selPrograms.length === 0)}>
                All Programs
              </button>
              {programs.map((p) => (
                <button key={p.id} type="button" onClick={() => toggle(selPrograms, setSelPrograms, p.id)} className={chipCls(selPrograms.includes(p.id))}>
                  {p.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Example: select only "Sanskar" and the announcement is shown only to Sanskar teachers/staff — nobody else is disturbed.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPinned"
              checked={formData.isPinned}
              onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
              className="rounded text-primary focus:ring-primary"
            />
            <label htmlFor="isPinned" className="text-sm text-neutral-700">Pin to top</label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={posting}>{formData.id ? 'Save Changes' : 'Post Announcement'}</Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
};
