import { Suspense, startTransition, useState } from 'react';
import Report from './Report.jsx';

export default function Dashboard() {
  const [reportId, setReportId] = useState(null);
  const [tab, setTab] = useState('overview');
  return (
    <>
      <button onClick={() => startTransition(() => setReportId('q3'))}>Open Q3 report</button>
      <button onClick={() => startTransition(() => setTab('activity'))}>Activity</button>
      <p>Tab: {tab}</p>
      <Suspense fallback={<p>Loading report…</p>}>{reportId && <Report id={reportId} />}</Suspense>
    </>
  );
}
