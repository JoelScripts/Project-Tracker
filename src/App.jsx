import React, { useMemo, useState } from 'react';
import { BOARD_TINTS, findTask, useStore } from './store.jsx';
import Sidebar from './components/Sidebar.jsx';
import BoardView from './components/BoardView.jsx';
import BoardConfig from './components/BoardConfig.jsx';
import TaskModal from './components/TaskModal.jsx';
import Icon from './components/Icon.jsx';

export default function App() {
  const { state, dispatch } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openTaskId, setOpenTaskId] = useState(null);

  const board = useMemo(
    () => state.boards.find((b) => b.id === state.activeBoardId) || state.boards[0] || null,
    [state.boards, state.activeBoardId]
  );

  const openTask = board ? findTask(board, openTaskId) : null;
  const openLane = openTask ? board.lanes.find((l) => l.tasks.some((t) => t.id === openTask.id)) : null;
  const tint = BOARD_TINTS.find((t) => t.id === board?.tint) || BOARD_TINTS[0];

  const matches = useMemo(() => {
    if (!board || !query) return 0;
    return board.lanes
      .flatMap((l) => l.tasks)
      .filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(query)).length;
  }, [board, query]);

  if (!board) {
    return (
      <div className="app app--blank">
        <div className="blank-state">
          <span className="blank-state__code">[ no boards ]</span>
          <h1>Nothing to track yet</h1>
          <p>Create a board, add a couple of lanes, and start moving work through them.</p>
          <button
            className="btn btn--primary"
            onClick={() => dispatch({ type: 'addBoard', name: 'My Project' })}
          >
            <Icon name="plus" size={15} /> Create a board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />

      <main className="main" style={{ '--board-bg': tint.bg, '--board-grid': tint.grid }}>
        <header className="topbar">
          <div className="topbar__path">
            <span className="topbar__mark">
              <Icon name="board" size={15} />
            </span>
            <span className="topbar__crumb">tracker</span>
            <span className="sep">/</span>
            <h1>{board.name}</h1>
          </div>

          <div className="topbar__tools">
            <div className={`filter ${query ? 'is-filled' : ''}`}>
              <Icon name="search" size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="filter tasks"
                aria-label="Filter tasks"
              />
              {query && (
                <>
                  <span className="filter__count">{String(matches).padStart(2, '0')}</span>
                  <button
                    className="icon-btn icon-btn--xs"
                    onClick={() => setQuery('')}
                    aria-label="Clear filter"
                  >
                    <Icon name="close" size={13} />
                  </button>
                </>
              )}
            </div>

            <button
              className={`icon-btn icon-btn--lg ${configOpen ? 'is-active' : ''}`}
              onClick={() => setConfigOpen((o) => !o)}
              aria-label="Board settings"
            >
              <Icon name="more" size={18} />
            </button>
          </div>
        </header>

        <BoardView board={board} query={query} onOpenTask={setOpenTaskId} />
      </main>

      {configOpen && <BoardConfig board={board} onClose={() => setConfigOpen(false)} />}

      {openTask && openLane && (
        <TaskModal
          task={openTask}
          lane={openLane}
          board={board}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
