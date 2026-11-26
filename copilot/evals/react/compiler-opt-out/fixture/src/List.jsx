import { useCallback, useState } from 'react';
import Row from './Row.jsx';

export default function List({ items }) {
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');
  const handleSelect = useCallback((id) => setSelectedId(id), []);

  return (
    <section>
      <label>
        Note
        <input value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <ul>
        {items.map((item) => (
          <Row key={item.id} item={item} selected={item.id === selectedId} onSelect={handleSelect} />
        ))}
      </ul>
    </section>
  );
}
