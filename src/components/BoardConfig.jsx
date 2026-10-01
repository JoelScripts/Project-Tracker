import React, { useEffect, useRef, useState } from 'react';
import { BOARD_TINTS, LABEL_COLORS, useStore } from '../store.jsx';
import Icon from './Icon.jsx';

export default function BoardConfig({ board, onClose }) {
  const { dispatch } = useStore();
  const [name, setName] = useState(board.name);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  const removeBoard = () => {
    if (window.confirm(`Delete "${board.name}" and all of its tasks?`)) {
      dispatch({ type: 'deleteBoard', id: board.id });
      onClose();
    }
  };

  const addLabel = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    dispatch({ type: 'addLabel', name: newLabel.trim(), color: newColor });
    setNewLabel('');
    setNewColor(LABEL_COLORS[(LABEL_COLORS.indexOf(newColor) + 1) % LABEL_COLORS.length]);
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="panel" ref={ref} role="dialog" aria-label="Board settings">
        <header className="panel__head">
          <h2>Board config</h2>
          <button className="icon-btn icon-btn--xs" onClick={onClose} aria-label="Close">
            <Icon name="close" size={15} />
          </button>
        </header>

        <section className="panel__section">
          <label className="section-label" htmlFor="board-name">
            Name
          </label>
          <input
            id="board-name"
            className="input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              dispatch({ type: 'renameBoard', name: e.target.value });
            }}
          />
        </section>

        <section className="panel__section">
          <span className="section-label">Backdrop</span>
          <div className="tint-grid">
            {BOARD_TINTS.map((tint) => (
              <button
                key={tint.id}
                className={`tint ${board.tint === tint.id ? 'is-active' : ''}`}
                style={{ background: tint.bg, '--tint-grid': tint.grid }}
                onClick={() => dispatch({ type: 'setBoardTint', tint: tint.id })}
                title={tint.name}
                aria-label={`${tint.name} backdrop`}
              >
                {board.tint === tint.id && <Icon name="check" size={13} />}
              </button>
            ))}
          </div>
        </section>

        <section className="panel__section">
          <span className="section-label">Labels</span>
          <ul className="label-editor">
            {board.labels.map((label) => (
              <li key={label.id} className="label-editor__row">
                <i className="label-editor__swatch" style={{ background: label.color }} />
                <input
                  className="input input--sm"
                  value={label.name}
                  onChange={(e) =>
                    dispatch({ type: 'updateLabel', id: label.id, patch: { name: e.target.value } })
                  }
                />
                <button
                  className="icon-btn icon-btn--xs icon-btn--danger"
                  onClick={() => dispatch({ type: 'deleteLabel', id: label.id })}
                  aria-label={`Delete ${label.name} label`}
                >
                  <Icon name="trash" size={14} />
                </button>
              </li>
            ))}
          </ul>

          <form className="label-editor__add" onSubmit={addLabel}>
            <input
              className="input input--sm"
              placeholder="New label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <div className="swatch-row">
              {LABEL_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`swatch-dot ${newColor === color ? 'is-active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setNewColor(color)}
                  aria-label={`Use colour ${color}`}
                />
              ))}
            </div>
            <button className="btn btn--sm" type="submit">
              Add label
            </button>
          </form>
        </section>

        <section className="panel__section panel__section--danger">
          <button className="btn btn--danger" onClick={removeBoard}>
            <Icon name="trash" size={14} /> Delete board
          </button>
        </section>
      </div>
    </>
  );
}
