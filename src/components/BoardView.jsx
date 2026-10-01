import React, { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { findTask, useStore } from '../store.jsx';
import Lane from './Lane.jsx';
import Icon from './Icon.jsx';

/**
 * Prefer the task under the pointer, fall back to the lane containing it.
 *
 * A lane and its tasks occupy overlapping rectangles, so the default collision
 * detection cannot tell "dropped in the gap between two tasks" from "dropped on
 * a task". Resolving tasks first makes drops land where they look like they will.
 */
function taskFirst(args) {
  const { active, pointerCoordinates, droppableContainers } = args;
  if (!pointerCoordinates) return closestCorners(args);

  const hits = droppableContainers.filter((container) => {
    if (container.disabled || container.id === active.id) return false;
    const rect = container.rect.current;
    if (!rect) return false;
    return (
      pointerCoordinates.x >= rect.left &&
      pointerCoordinates.x <= rect.right &&
      pointerCoordinates.y >= rect.top &&
      pointerCoordinates.y <= rect.bottom
    );
  });

  const tasks = hits.filter((c) => c.data.current?.type === 'task');
  if (tasks.length) return [{ id: tasks[tasks.length - 1].id }];

  const lanes = hits.filter((c) => c.data.current?.type === 'lane');
  if (lanes.length) return [{ id: lanes[0].id }];

  return closestCorners(args);
}

/** Insert below the hovered task when the dragged task's centre is lower. */
function isBelowOver(active, over) {
  const activeRect = active.rect.current?.translated;
  const overRect = over.rect.current;
  if (!activeRect || !overRect) return false;
  return activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2;
}

export default function BoardView({ board, query, onOpenTask }) {
  const { dispatch } = useStore();
  const [activeId, setActiveId] = useState(null);
  const [addingLane, setAddingLane] = useState(false);
  const [laneTitle, setLaneTitle] = useState('');
  const dragJustEnded = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findLaneWithTask = useCallback(
    (taskId) => board.lanes.find((l) => l.tasks.some((t) => t.id === taskId)),
    [board.lanes]
  );

  const markDragEnded = () => {
    dragJustEnded.current = true;
    window.setTimeout(() => {
      dragJustEnded.current = false;
    }, 150);
  };

  const handleDragEnd = ({ active, over }) => {
    markDragEnded();
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const lanes = board.lanes;

    // Reordering whole lanes.
    if (String(active.id).startsWith('ln_')) {
      const overLaneId = String(over.id).startsWith('ln_') ? over.id : findLaneWithTask(over.id)?.id;
      if (!overLaneId) return;
      const from = lanes.findIndex((l) => l.id === active.id);
      const to = lanes.findIndex((l) => l.id === overLaneId);
      if (from !== -1 && to !== -1 && from !== to) dispatch({ type: 'moveLane', from, to });
      return;
    }

    // Moving a task.
    const sourceLane = findLaneWithTask(active.id);
    if (!sourceLane) return;
    const sourceIndex = sourceLane.tasks.findIndex((t) => t.id === active.id);

    const overIsTask = String(over.id).startsWith('tk_');
    const destLane = overIsTask ? findLaneWithTask(over.id) : lanes.find((l) => l.id === over.id);
    if (!destLane) return;

    let destIndex;
    if (overIsTask) {
      const overIndex = destLane.tasks.findIndex((t) => t.id === over.id);
      if (overIndex === -1) return;
      destIndex = overIndex + (isBelowOver(active, over) ? 1 : 0);
    } else {
      destIndex = destLane.tasks.length;
    }

    // The task leaves its source first, so same-lane indexes shift by one.
    if (sourceLane.id === destLane.id && sourceIndex < destIndex) destIndex -= 1;
    if (sourceLane.id === destLane.id && destIndex === sourceIndex) return;

    dispatch({ type: 'moveTask', taskId: active.id, destLaneId: destLane.id, destIndex });
  };

  const submitLane = (e) => {
    e.preventDefault();
    if (laneTitle.trim()) dispatch({ type: 'addLane', title: laneTitle.trim() });
    setLaneTitle('');
    setAddingLane(false);
  };

  const activeTask = activeId ? findTask(board, activeId) : null;
  const activeLane = activeId ? board.lanes.find((l) => l.id === activeId) : null;
  const activeTaskIndex = activeTask ? board.lanes.flatMap((l) => l.tasks).indexOf(activeTask) : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={taskFirst}
      onDragStart={({ active }) => {
        dragJustEnded.current = true;
        setActiveId(active.id);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        markDragEnded();
        setActiveId(null);
      }}
    >
      <div className="board">
        <SortableContext
          items={board.lanes.map((l) => l.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="board__lanes">
            {board.lanes.map((lane, i) => (
              <Lane
                key={lane.id}
                lane={lane}
                index={i}
                labels={board.labels}
                query={query}
                onOpenTask={onOpenTask}
                dragJustEnded={dragJustEnded}
              />
            ))}

            {addingLane ? (
              <form className="lane-form" onSubmit={submitLane}>
                <input
                  autoFocus
                  className="input lane-form__input"
                  placeholder="Lane name…"
                  value={laneTitle}
                  onChange={(e) => setLaneTitle(e.target.value)}
                  onBlur={(e) => {
                    if (laneTitle.trim()) submitLane(e);
                    else setAddingLane(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setLaneTitle('');
                      setAddingLane(false);
                    }
                  }}
                />
              </form>
            ) : (
              <button className="lane-add" onClick={() => setAddingLane(true)}>
                <span className="lane-add__index">{String(board.lanes.length + 1).padStart(2, '0')}</span>
                <span className="lane-add__label">
                  <Icon name="plus" size={14} /> New lane
                </span>
              </button>
            )}
          </div>
        </SortableContext>

        {board.lanes.length === 0 && !addingLane && (
          <div className="board__empty">
            <span className="board__empty-code">[ no lanes ]</span>
            <h2>This board is empty</h2>
            <p>
              Lanes are the stages work moves through - To Do, In Progress, Done. Create the first
              one to start tracking.
            </p>
            <button className="btn btn--primary" onClick={() => setAddingLane(true)}>
              <Icon name="plus" size={15} /> Create a lane
            </button>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="task task--overlay">
            {(activeTask.labelIds || []).length > 0 && (
              <div className="task__labels">
                {activeTask.labelIds.map((id) => {
                  const label = board.labels.find((l) => l.id === id);
                  return label ? (
                    <span key={id} className="tick">
                      <i className="tick__swatch" style={{ background: label.color }} />
                      {label.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <p className="task__title">{activeTask.title}</p>
            <span className="task__grab-hint">moving · {activeTaskIndex + 1}</span>
          </div>
        ) : activeLane ? (
          <div className="lane lane--overlay">
            <header className="lane__head">
              <span className="lane__index">
                {String(board.lanes.findIndex((l) => l.id === activeLane.id) + 1).padStart(2, '0')}
              </span>
              <h3 className="lane__title">{activeLane.title}</h3>
              <span className="lane__count">
                {String(activeLane.tasks.length).padStart(2, '0')}
              </span>
            </header>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
