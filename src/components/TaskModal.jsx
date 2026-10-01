import React, { useEffect, useState } from 'react';
import { uid, useStore } from '../store.jsx';
import Icon from './Icon.jsx';

export default function TaskModal({ task, lane, board, onClose }) {
  const { dispatch } = useStore();
  const [newItem, setNewItem] = useState('');

  const patch = (p) => dispatch({ type: 'updateTask', taskId: task.id, patch: p });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleLabel = (labelId) => {
    const has = (task.labelIds || []).includes(labelId);
    patch({
      labelIds: has
        ? task.labelIds.filter((i) => i !== labelId)
        : [...task.labelIds, labelId],
    });
  };

  const addItem = (e) => {
    e.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    patch({ checklist: [...task.checklist, { id: uid('ck'), text, done: false }] });
    setNewItem('');
  };

  const doneCount = task.checklist.filter((i) => i.done).length;
  const progress = task.checklist.length
    ? Math.round((doneCount / task.checklist.length) * 100)
    : 0;

  const removeTask = () => {
    if (window.confirm('Delete this task? This cannot be undone.')) {
      dispatch({ type: 'deleteTask', taskId: task.id });
      onClose();
    }
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit task">
        <header className="modal__head">
          <div className="modal__heading">
            <div>
              <span className="modal__path">
                {board.name} <span className="sep">/</span> {lane.title}
              </span>
              <input
                className="modal__title"
                value={task.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Task title"
                aria-label="Task title"
                autoFocus
              />
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="modal__body">
          <section className="modal__section">
            <span className="section-label">Labels</span>
            <div className="label-picker">
              {board.labels.map((label) => {
                const active = (task.labelIds || []).includes(label.id);
                return (
                  <button
                    key={label.id}
                    className={`label-opt ${active ? 'is-active' : ''}`}
                    style={{ '--label-color': label.color }}
                    onClick={() => toggleLabel(label.id)}
                    aria-pressed={active}
                  >
                    <i className="label-opt__swatch" />
                    {label.name}
                    {active && <Icon name="check" size={13} />}
                  </button>
                );
              })}
              {board.labels.length === 0 && <p className="hint">No labels defined.</p>}
            </div>
          </section>

          <section className="modal__section modal__section--inline">
            <label className="section-label" htmlFor="due">
              Due
            </label>
            <input
              id="due"
              type="date"
              className="input input--inline"
              value={task.dueDate || ''}
              onChange={(e) => patch({ dueDate: e.target.value })}
            />
            {task.dueDate && (
              <button className="btn btn--sm btn--ghost" onClick={() => patch({ dueDate: '' })}>
                Clear
              </button>
            )}
          </section>

          <section className="modal__section">
            <span className="section-label">Notes</span>
            <textarea
              className="textarea"
              rows={5}
              placeholder="Detail, links, gotchas…"
              value={task.description || ''}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </section>

          <section className="modal__section">
            <span className="section-label">
              Subtasks
              {task.checklist.length > 0 && <em className="section-label__hint">{progress}%</em>}
            </span>

            {task.checklist.length > 0 && (
              <>
                <div className="progress">
                  <div className="progress__bar" style={{ width: `${progress}%` }} />
                </div>
                <ul className="checklist">
                  {task.checklist.map((item) => (
                    <li key={item.id} className={`checklist__item ${item.done ? 'is-done' : ''}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() =>
                            patch({
                              checklist: task.checklist.map((i) =>
                                i.id === item.id ? { ...i, done: !i.done } : i
                              ),
                            })
                          }
                        />
                        <span>{item.text}</span>
                      </label>
                      <button
                        className="icon-btn icon-btn--xs icon-btn--danger"
                        onClick={() =>
                          patch({ checklist: task.checklist.filter((i) => i.id !== item.id) })
                        }
                        aria-label="Remove subtask"
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <form className="checklist__add" onSubmit={addItem}>
              <input
                className="input"
                placeholder="Add a subtask"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
              />
              <button className="btn btn--sm" type="submit">
                Add
              </button>
            </form>
          </section>
        </div>

        <footer className="modal__foot">
          <button className="btn btn--danger" onClick={removeTask}>
            <Icon name="trash" size={14} /> Delete task
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </>
  );
}
