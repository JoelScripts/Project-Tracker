import React, { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from './Icon.jsx';

/** Compact relative due date, e.g. `today`, `+3d`, `-2d`. */
export function dueInfo(value) {
  if (!value) return null;
  const due = new Date(`${value}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  const stamp = due
    .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    .toUpperCase();

  if (diff === 0) return { text: 'TODAY', state: 'soon' };
  if (diff === 1) return { text: 'TOMORROW', state: 'soon' };
  if (diff < 0) return { text: stamp, state: 'overdue' };
  return { text: stamp, state: diff <= 2 ? 'soon' : 'normal' };
}

const TaskRow = forwardRef(function TaskRow(
  { task, labels, isDragging, onClick, style, attributes, listeners },
  ref
) {
  const due = dueInfo(task.dueDate);
  const done = task.checklist.filter((i) => i.done).length;
  const total = task.checklist.length;
  const shown = (task.labelIds || [])
    .map((id) => labels.find((l) => l.id === id))
    .filter(Boolean);

  return (
    <div
      ref={ref}
      style={style}
      className={`task ${isDragging ? 'is-dragging' : ''}`}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {shown.length > 0 && (
        <div className="task__labels">
          {shown.map((label) => (
            <span key={label.id} className="tick" title={label.name}>
              <i className="tick__swatch" style={{ background: label.color }} />
              {label.name}
            </span>
          ))}
        </div>
      )}

      <p className="task__title">{task.title || 'Untitled task'}</p>

      {(task.description || due || total > 0) && (
        <div className="task__meta">
          {task.description && (
            <span className="meta-item" title="Has a description">
              <Icon name="text" size={12} />
            </span>
          )}
          {due && <span className={`meta-item meta-item--due is-${due.state}`}>{due.text}</span>}
          {total > 0 && (
            <span className={`meta-item meta-item--check ${done === total ? 'is-done' : ''}`}>
              <Icon name="checklist" size={12} />
              {done}/{total}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export default function TaskRowSortable({ task, labels, laneId, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', laneId },
  });

  return (
    <TaskRow
      ref={setNodeRef}
      task={task}
      labels={labels}
      isDragging={isDragging}
      onClick={onOpen}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      attributes={attributes}
      listeners={listeners}
    />
  );
}
