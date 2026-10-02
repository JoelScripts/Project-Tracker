import React, { useEffect, useRef, useState } from 'react';
import { parseBackup, serializeBackup, summarize, useStore } from '../store.jsx';
import Icon from './Icon.jsx';

const stamp = () => new Date().toISOString().slice(0, 10);

export default function Sidebar({ open, onToggle }) {
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!status) return undefined;
    const t = setTimeout(() => setStatus(null), 5000);
    return () => clearTimeout(t);
  }, [status]);

  const submit = (e) => {
    e.preventDefault();
    if (name.trim()) dispatch({ type: 'addBoard', name });
    setName('');
    setAdding(false);
  };

  const counts = summarize(state);

  const doExport = () => {
    const blob = new Blob([serializeBackup(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-tracker-${stamp()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus({
      kind: 'ok',
      text: `Exported ${counts.boards} board(s), ${counts.tasks} task(s). Keep this file safe — it is your copy.`,
    });
  };

  const doImport = (file) => {
    if (!file) return;
    const reader = new FileReader();

    reader.onload = () => {
      let next;
      try {
        next = parseBackup(String(reader.result));
      } catch (err) {
        setStatus({ kind: 'bad', text: err.message || 'That file could not be read.' });
        return;
      }
      const incoming = summarize(next);
      const confirmed = window.confirm(
        `Replace everything on this device?\n\n` +
          `On this device now: ${counts.boards} board(s), ${counts.tasks} task(s)\n` +
          `In the file: ${incoming.boards} board(s), ${incoming.tasks} task(s)\n\n` +
          `This cannot be undone. Export first if you want to keep it.`
      );
      if (!confirmed) return;
      dispatch({ type: 'importState', state: next });
      setStatus({
        kind: 'ok',
        text: `Imported ${incoming.boards} board(s), ${incoming.tasks} task(s).`,
      });
    };

    reader.onerror = () => setStatus({ kind: 'bad', text: 'That file could not be read.' });
    reader.readAsText(file);
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
        <div className="sidebar__status">
          <span className="dot" />
          saved locally
        </div>

        <p className="sidebar__hint">
          Boards live in this browser only. Export a file to move them to another device.
        </p>

        <div className="sidebar__actions">
          <button className="btn btn--sm btn--block" onClick={doExport}>
            <Icon name="download" size={14} /> Export
          </button>
          <button className="btn btn--sm btn--block" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(e) => {
              doImport(e.target.files?.[0]);
              e.target.value = '';   // so re-picking the same file fires again
            }}
          />
        </div>

        {status && (
          <p className={`sidebar__msg sidebar__msg--${status.kind}`} role="status">
            {status.text}
          </p>
        )}
      </footer>
    </aside>
  );
}
