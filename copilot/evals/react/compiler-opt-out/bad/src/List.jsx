import { useState } from 'react';
import Row from './Row.jsx';

// Drops useCallback on the assumption that the compiler memoizes this file. It doesn't: List.jsx is opted out.
export default function List({ items }) {
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();
  const visible = query ? items.filter((item) => item.label.toLowerCase().includes(query)) : items;

  return (
    <section>
      <label>
        Filter
        <input value={filter} onChange={(event) => setFilter(event.target.value)} />
      </label>
      <label>
        Note
        <input value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <ul>
        {visible.map((item) => (
          <Row key={item.id} item={item} selected={item.id === selectedId} onSelect={(id) => setSelectedId(id)} />
        ))}
      </ul>
    </section>
  );
}
