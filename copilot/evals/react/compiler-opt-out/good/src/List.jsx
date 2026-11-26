import { useCallback, useState } from 'react';
import Row from './Row.jsx';

// Opted out of the compiler (compiler.config.js): keep handleSelect stable so memo(Row) can skip renders.
export default function List({ items }) {
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');
  const handleSelect = useCallback((id) => setSelectedId(id), []);
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
          <Row key={item.id} item={item} selected={item.id === selectedId} onSelect={handleSelect} />
        ))}
      </ul>
    </section>
  );
}
