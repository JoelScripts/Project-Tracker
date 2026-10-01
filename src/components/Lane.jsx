import React, { useRef, useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store.jsx';
import Icon from './Icon.jsx';
import SortableTask from './TaskRow.jsx';

export default function Lane({ lane, index, labels, query, onOpenTask, dragJustEnded }) {
  const { dispatch } = useStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lane.id,
    data: { type: 'lane' },
  });

  const [title, setTitle] = useState(lane.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const composerRef = useRef(null);

  // Follow external renames while we are not the one editing.
  const titleRef = useRef(lane.title);
  if (!editingTitle && titleRef.current !== lane.title) {
    titleRef.current = lane.title;
    setTitle(lane.title);
  }

  const visible = query
    ? lane.tasks.filter((task) => {
        const haystack = [
          task.title,
          task.description,
          ...(task.labelIds || []).map((id) => labels.find((l) => l.id === id)?.name || ''),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
    : lane.tasks;

  const commitTitle = () => {
    const next = title.trim() || lane.title;
    setTitle(next);
    setEditingTitle(false);
    if (next !== lane.title) dispatch({ type: 'renameLane', laneId: lane.id, title: next });
  };

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    dispatch({ type: 'addTask', laneId: lane.id, title: text });
    setDraft('');
    composerRef.current?.focus();
  };

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`lane ${isDragging ? 'is-dragging' : ''}`}
      data-lane-index={index}
    >
      {/* The whole header is the drag handle so the body stays clickable. */}
      <header className="lane__head" {...attributes} {...listeners}>
        <span className="lane__index">{String(index + 1).padStart(2, '0')}</span>

        {editingTitle ? (
          <input
            className="lane__title-input"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') {
                setTitle(lane.title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <h3
            className="lane__title"
            onClick={() => setEditingTitle(true)}
            title="Click to rename"
          >
            {lane.title}
          </h3>
        )}

        <span className="lane__count">{String(visible.length).padStart(2, '0')}</span>

        <div className="lane__menu-wrap">
          <button
            className="icon-btn icon-btn--xs"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={`Actions for ${lane.title}`}
          >
            <Icon name="more" size={15} />
          </button>
          {menuOpen && (
            <>
              <div className="menu-scrim" onClick={() => setMenuOpen(false)} />
              <div className="popover">
                <button
                  className="popover__item"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditingTitle(true);
                  }}
                >
                  <Icon name="text" size={14} /> Rename lane
                </button>
                <button
                  className="popover__item popover__item--danger"
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(`Delete lane "${lane.title}" and everything in it?`)) {
                      dispatch({ type: 'deleteLane', laneId: lane.id });
                    }
                  }}
                >
                  <Icon name="trash" size={14} /> Delete lane
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="lane__tasks">
          {visible.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              labels={labels}
              laneId={lane.id}
              onOpen={() => {
                if (dragJustEnded.current) return;
                onOpenTask(task.id);
              }}
            />
          ))}

          {visible.length === 0 && (
            <p className="lane__empty">{query ? 'no matches' : 'empty'}</p>
          )}
        </div>
      </SortableContext>

      {composing ? (
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            addTask();
          }}
        >
          <textarea
            ref={composerRef}
            className="composer__input"
            placeholder="Task title…"
            value={draft}
            autoFocus
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addTask();
              }
              if (e.key === 'Escape') {
                setDraft('');
                setComposing(false);
              }
            }}
          />
          <div className="composer__actions">
            <button className="btn btn--primary btn--sm" type="submit">
              Add
            </button>
            <span className="hint-key">esc to cancel</span>
            <button
              className="icon-btn icon-btn--xs"
              type="button"
              onClick={() => {
                setDraft('');
                setComposing(false);
              }}
              aria-label="Cancel"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        </form>
      ) : (
        <button className="lane__add" onClick={() => setComposing(true)}>
          <Icon name="plus" size={14} />
          New task
        </button>
      )}
    </section>
  );
}
