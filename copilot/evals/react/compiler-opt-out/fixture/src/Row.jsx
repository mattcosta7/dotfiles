import { memo } from 'react';

const Row = memo(function Row({ item, selected, onSelect }) {
  return (
    <li aria-selected={selected}>
      <button type="button" onClick={() => onSelect(item.id)}>
        {item.label}
      </button>
    </li>
  );
});

export default Row;
