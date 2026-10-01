import React, { useState } from 'react';
import { useStore } from '../store.jsx';
import Icon from './Icon.jsx';

export default function Sidebar({ open, onToggle }) {
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (name.trim()) dispatch({ type: 'addBoard', name });
    setName('');
    setAdding(false);
  };

  if (!open) {
    return (
      <aside className="sidebar sidebar--rail">
        <button className="icon-btn" onClick={onToggle} title="Expand sidebar" aria-label="Expand sidebar">
          <Icon name="chevronRight" size={17} />
        </button>
        <div className="rail-mark">PT</div>
        <button className="icon-btn" onClick={() => { onToggle(); setAdding(true); }} title="New board" aria-label="New board">
          <Icon name="plus" size={17} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__head">
        <span className="brand">
          <span className="brand__mark">
            <Icon name="board" size={15} />
          </span>
          <span className="brand__name">Project Tracker</span>
        </span>
        <button className="icon-btn icon-btn--xs" onClick={onToggle} title="Collapse sidebar" aria-label="Collapse sidebar">
          <Icon name="chevronLeft" size={16} />
        </button>
      </div>

      <div className="section-label section-label--side">Boards</div>

      <nav className="board-nav" aria-label="Boards">
        {state.boards.map((board, i) => {
          const active = board.id === state.activeBoardId;
          const total = board.lanes.reduce((n, l) => n + l.tasks.length, 0);
          return (
            <button
              key={board.id}
              className={`board-row ${active ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'selectBoard', id: board.id })}
            >
              <span className="board-row__index">{String(i + 1).padStart(2, '0')}</span>
              <span className="board-row__name">{board.name}</span>
              <span className="board-row__count">{String(total).padStart(2, '0')}</span>
            </button>
          );
        })}

        {adding ? (
          <form className="board-row__form" onSubmit={submit}>
            <input
              autoFocus
              className="input input--sm"
              placeholder="Board name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={submit}
              onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
            />
          </form>
        ) : (
          <button className="board-row board-row--new" onClick={() => setAdding(true)}>
            <span className="board-row__index">+</span>
            <span className="board-row__name">New board</span>
          </button>
        )}
      </nav>

      <footer className="sidebar__foot">
        <span className="dot" />
        saved locally
      </footer>
    </aside>
  );
}
