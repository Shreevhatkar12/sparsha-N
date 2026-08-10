import React, { useCallback, useEffect, useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { DropoutSection } from '../components/swayam/DropoutSection';
import { listCenters } from '../services/centers.service';
import { listDropouts, type DropoutListResponse } from '../services/swayam.service';
import type { CenterSummary } from '../types';

const OUT_CENTER_NAME = 'Out of Center';

// Standalone page for the Swayam coordinator's dropout tracking —
// "Dropout Students" and "Re-enrolled" sub-sections live inside.
export const DropoutPage: React.FC = () => {
  const [data, setData] = useState<DropoutListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<CenterSummary[]>([]);

  const load = useCallback(async () => {
    try {
      setData(await listDropouts());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    listCenters()
      .then((res) =>
        setCenters(
          (Array.isArray(res) ? res : []).filter(
            (c: CenterSummary) => (c.name || '').toLowerCase() !== OUT_CENTER_NAME.toLowerCase(),
          ),
        ),
      )
      .catch(console.error);
  }, [load]);

  return (
    <PageWrapper title="Dropout Student Info">
      <DropoutSection data={data} loading={loading} centers={centers} onReload={load} />
    </PageWrapper>
  );
};

export default DropoutPage;
