import React, { createContext, useContext, useEffect, useReducer } from 'react';

const STORAGE_KEY = 'project-tracker.v2';

/**
 * Short, collision-proof id. The prefix identifies the kind of entity, which
 * also lets the drag layer tell a lane apart from a task without extra lookups.
 */
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Colour ticks used on tasks. Kept muted so the accent stays dominant. */
export const LABEL_COLORS = [
  '#ff6b6b',
  '#facc15',
  '#f5d76e',
  '#4ade80',
  '#38bdf8',
  '#818cf8',
  '#c084fc',
  '#94a3b8',
];

/** Board backdrops: near-black tints, never gradients. */
export const BOARD_TINTS = [
  { id: 'graphite', name: 'Graphite', bg: '#0a0b0e', grid: 'rgba(255,255,255,0.055)' },
  { id: 'slate', name: 'Slate', bg: '#0e1116', grid: 'rgba(255,255,255,0.06)' },
  { id: 'ink', name: 'Ink', bg: '#060a14', grid: 'rgba(126,160,255,0.1)' },
  { id: 'forest', name: 'Forest', bg: '#05110b', grid: 'rgba(74,222,128,0.1)' },
  { id: 'ember', name: 'Ember', bg: '#120a05', grid: 'rgba(255,166,43,0.1)' },
  { id: 'plum', name: 'Plum', bg: '#0e0713', grid: 'rgba(192,132,252,0.1)' },
  { id: 'wine', name: 'Wine', bg: '#130709', grid: 'rgba(255,107,107,0.1)' },
  { id: 'mint', name: 'Mint', bg: '#051113', grid: 'rgba(56,189,248,0.1)' },
];

export const DEFAULT_LABELS = [
  { id: 'lb_bug', name: 'Bug', color: '#ff6b6b' },
  { id: 'lb_feature', name: 'Feature', color: '#38bdf8' },
  { id: 'lb_urgent', name: 'Urgent', color: '#facc15' },
  { id: 'lb_done', name: 'Shipped', color: '#4ade80' },
  { id: 'lb_research', name: 'Research', color: '#c084fc' },
  { id: 'lb_blocked', name: 'Blocked', color: '#94a3b8' },
];

const makeTask = (title, extra = {}) => ({
  id: uid('tk'),
  title,
  description: '',
  labelIds: [],
  dueDate: '',
  checklist: [],
  createdAt: Date.now(),
  ...extra,
});

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A board with real-looking content so the app is useful the moment it opens. */
function seedState() {
  const boardId = uid('bd');
  return {
    activeBoardId: boardId,
    boards: [
      {
        id: boardId,
        name: 'WCHRP Dev To Do',
        tint: 'ink',
        labels: DEFAULT_LABELS,
        lanes: [
          {
            id: uid('ln'),
            title: 'To Do List',
            tasks: [
              makeTask('Sort out server restart schedule', {
                labelIds: ['lb_research'],
                dueDate: offsetDate(4),
              }),
              makeTask('Write changelog for last release', {
                labelIds: ['lb_feature'],
                checklist: [
                  { id: uid('ck'), text: 'Collect merged PRs', done: true },
                  { id: uid('ck'), text: 'Draft the notes', done: false },
                  { id: uid('ck'), text: 'Post to Discord', done: false },
                ],
              }),
            ],
          },
          {
            id: uid('ln'),
            title: 'Things Being Worked on',
            tasks: [
              makeTask('LEO Cars And Liveries Are Being Made and worked on and tested', {
                labelIds: ['lb_feature', 'lb_urgent'],
                description:
                  'Model set is imported, liveries are still being painted. Needs a performance pass on the server before it ships.',
                dueDate: offsetDate(2),
              }),
            ],
          },
          {
            id: uid('ln'),
            title: 'Things Tested and Added to the Server',
            tasks: [
              makeTask('Voice range fix verified on live server', {
                labelIds: ['lb_done', 'lb_bug'],
                dueDate: offsetDate(-3),
              }),
            ],
          },
        ],
      },
    ],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.boards)) return seedState();
    return parsed;
  } catch {
    return seedState();
  }
}

const arrayMove = (arr, from, to) => {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** Run `fn` against the active board and return a new state. */
const mapActiveBoard = (state, fn) => ({
  ...state,
  boards: state.boards.map((b) => (b.id === state.activeBoardId ? fn(b) : b)),
});

const mapLane = (board, laneId, fn) => ({
  ...board,
  lanes: board.lanes.map((l) => (l.id === laneId ? fn(l) : l)),
});

export function findTaskLocation(board, taskId) {
  for (const lane of board.lanes) {
    const index = lane.tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) return { laneId: lane.id, index };
  }
  return null;
}

export function findTask(board, taskId) {
  for (const lane of board.lanes) {
    const task = lane.tasks.find((t) => t.id === taskId);
    if (task) return task;
  }
  return null;
}

function reducer(state, action) {
  switch (action.type) {
    case 'selectBoard':
      return { ...state, activeBoardId: action.id };

    case 'addBoard': {
      const board = {
        id: uid('bd'),
        name: action.name.trim() || 'Untitled board',
        tint: BOARD_TINTS[(state.boards.length + 1) % BOARD_TINTS.length].id,
        labels: DEFAULT_LABELS.map((l) => ({ ...l, id: uid('lb') })),
        lanes: [
          { id: uid('ln'), title: 'To Do', tasks: [] },
          { id: uid('ln'), title: 'In Progress', tasks: [] },
          { id: uid('ln'), title: 'Done', tasks: [] },
        ],
      };
      return { ...state, boards: [...state.boards, board], activeBoardId: board.id };
    }

    case 'renameBoard':
      return mapActiveBoard(state, (b) => ({ ...b, name: action.name }));

    case 'setBoardTint':
      return mapActiveBoard(state, (b) => ({ ...b, tint: action.tint }));

    case 'deleteBoard': {
      const boards = state.boards.filter((b) => b.id !== action.id);
      if (boards.length === 0) return { ...state, boards };
      const activeBoardId =
        state.activeBoardId === action.id ? boards[0].id : state.activeBoardId;
      return { ...state, boards, activeBoardId };
    }

    case 'addLane':
      return mapActiveBoard(state, (b) => ({
        ...b,
        lanes: [...b.lanes, { id: uid('ln'), title: action.title, tasks: [] }],
      }));

    case 'renameLane':
      return mapActiveBoard(state, (b) =>
        mapLane(b, action.laneId, (l) => ({ ...l, title: action.title }))
      );

    case 'deleteLane':
      return mapActiveBoard(state, (b) => ({
        ...b,
        lanes: b.lanes.filter((l) => l.id !== action.laneId),
      }));

    case 'moveLane':
      return mapActiveBoard(state, (b) => ({
        ...b,
        lanes: arrayMove(b.lanes, action.from, action.to),
      }));

    case 'addTask':
      return mapActiveBoard(state, (b) =>
        mapLane(b, action.laneId, (l) => ({
          ...l,
          tasks: [...l.tasks, makeTask(action.title)],
        }))
      );

    case 'updateTask':
      return mapActiveBoard(state, (b) => {
        const loc = findTaskLocation(b, action.taskId);
        if (!loc) return b;
        return mapLane(b, loc.laneId, (l) => ({
          ...l,
          tasks: l.tasks.map((t) =>
            t.id === action.taskId ? { ...t, ...action.patch, updatedAt: Date.now() } : t
          ),
        }));
      });

    case 'deleteTask':
      return mapActiveBoard(state, (b) => {
        const loc = findTaskLocation(b, action.taskId);
        if (!loc) return b;
        return mapLane(b, loc.laneId, (l) => ({
          ...l,
          tasks: l.tasks.filter((t) => t.id !== action.taskId),
        }));
      });

    /*
      `destIndex` is resolved against the destination lane AFTER the task has
      been lifted out of its source, so callers pre-adjust same-lane moves.
    */
    case 'moveTask':
      return mapActiveBoard(state, (b) => {
        const loc = findTaskLocation(b, action.taskId);
        if (!loc) return b;
        const task = b.lanes.find((l) => l.id === loc.laneId).tasks[loc.index];
        const stripped = b.lanes.map((l) =>
          l.id === loc.laneId ? { ...l, tasks: l.tasks.filter((t) => t.id !== action.taskId) } : l
        );
        return {
          ...b,
          lanes: stripped.map((l) => {
            if (l.id !== action.destLaneId) return l;
            const tasks = l.tasks.slice();
            const idx = Math.max(0, Math.min(action.destIndex ?? tasks.length, tasks.length));
            tasks.splice(idx, 0, task);
            return { ...l, tasks };
          }),
        };
      });

    case 'addLabel':
      return mapActiveBoard(state, (b) => ({
        ...b,
        labels: [...b.labels, { id: uid('lb'), name: action.name, color: action.color }],
      }));

    case 'updateLabel':
      return mapActiveBoard(state, (b) => ({
        ...b,
        labels: b.labels.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)),
      }));

    case 'deleteLabel':
      return mapActiveBoard(state, (b) => ({
        ...b,
        labels: b.labels.filter((l) => l.id !== action.id),
        lanes: b.lanes.map((lane) => ({
          ...lane,
          tasks: lane.tasks.map((t) => ({
            ...t,
            labelIds: (t.labelIds || []).filter((id) => id !== action.id),
          })),
        })),
      }));

    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded or storage unavailable - the session still works */
    }
  }, [state]);

  const value = { state, dispatch };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
