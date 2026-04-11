import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/useAuthStore';
import { listFormTemplates, type FormTemplateListItem } from '../../services/forms.service';
import { Plus, Pencil, FileText, Inbox } from 'lucide-react';

export const FormsListPage: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.currentUser?.role === 'admin');

  const [templates, setTemplates] = useState<FormTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listFormTemplates(undefined, isAdmin);
      setTemplates(rows);
    } catch {
      setError('Failed to load form templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [isAdmin]);

  return (
    <PageWrapper
      title="Forms"
      actions={
        isAdmin ? (
          <Button variant="primary" onClick={() => navigate('/forms/new')}>
            <Plus size={16} className="mr-2" /> New template
          </Button>
        ) : undefined
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <Card>
        {loading ? (
          <LoadingSpinner />
        ) : templates.length === 0 ? (
          <EmptyState
            title="No form templates"
            description={isAdmin ? 'Create a template to start collecting structured responses.' : 'Ask an admin to publish a form template.'}
            action={
              isAdmin ? (
                <Button variant="primary" onClick={() => navigate('/forms/new')}>
                  Create template
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-neutral-100 hover:bg-neutral-50/80">
                    <td className="py-3 pr-4 font-medium text-neutral-900">{t.name}</td>
                    <td className="py-3 pr-4 text-neutral-600">{t.formType}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={t.isActive ? 'success' : 'neutral'}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-neutral-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <Button variant="ghost" size="sm" className="px-2" onClick={() => navigate(`/forms/${t.id}/fill`)}>
                        <FileText size={16} className="mr-1" /> Fill
                      </Button>
                      <Button variant="ghost" size="sm" className="px-2" onClick={() => navigate(`/forms/${t.id}/submissions`)}>
                        <Inbox size={16} className="mr-1" /> Submissions
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" className="px-2" onClick={() => navigate(`/forms/${t.id}/edit`)}>
                          <Pencil size={16} className="mr-1" /> Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
};
