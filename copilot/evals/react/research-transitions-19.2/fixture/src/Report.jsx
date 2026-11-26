import { use } from 'react';
import { loadReport } from './reports.js';

export default function Report({ id }) {
  const report = use(loadReport(id));
  return <article>{report.title}</article>;
}
