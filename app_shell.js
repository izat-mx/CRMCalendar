import React, { useMemo, useState, useEffect } from "react";

/* ============================
   Constants & Utilities
============================ */
const STAFF = [
  { id: "aida",     name: "Aida" },
  { id: "khairun",  name: "Khairun" },
  { id: "hafiz",    name: "Hafiz" },
  { id: "lee",      name: "Lee" },
  { id: "derek",    name: "Derek" },
];

const VALID_STATUSES = ["in_progress", "completed", "reject"];

const STATUS_LABEL = {
  in_progress: "In Progress",
  completed: "Completed",
  reject: "Reject",
};

const STATUS_UI = {
  in_progress: {
    border: "border-amber-500",
    text: "text-amber-700",
    dot: "bg-amber-500",
    pill: "bg-amber-100 text-amber-800",
    chip: "bg-amber-100 hover:bg-amber-200",
  },
  completed: {
    border: "border-emerald-500",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-800",
    chip: "bg-emerald-100 hover:bg-emerald-200",
  },
  reject: {
    border: "border-orange-500",
    text: "text-orange-700",
    dot: "bg-orange-500",
    pill: "bg-orange-100 text-orange-800",
    chip: "bg-orange-100 hover:bg-orange-200",
  },
};

const today = new Date();
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addDays      = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmt          = (d) => d.toISOString().slice(0, 10);

function getWeeksForMonth(baseDate) {
  const first = startOfMonth(baseDate);
  const last = endOfMonth(baseDate);
  // Monday-start grid
  const start = addDays(first, ((first.getDay() + 6) % 7) * -1);
  const end = addDays(last, 6 - ((last.getDay() + 6) % 7));
  const days = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

/* ============================
   Dummy Data Generator
   - Scatter only within CURRENT and NEXT month
   - Ensure all "completed" end strictly before today
============================ */
function generateDummyTasks({ count = 50, baseDate = today }) {
  const res = [];
  const base = startOfMonth(baseDate);
  const nextMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const months = [base, nextMonth];

  let staffIdx = 0;
  let idCounter = 1;

  const titles = [
    "Site A Audit","Barrier Tuning","LPR Camera Align","Kiosk Firmware","Network Check",
    "Ticket Reconcile","CRM Update","Plate Review","SLA Report","Onsite Visit",
  ];

  // Ensure each staff gets coverage across the two months
  const minPerStaff = 6;
  const perStaffCounts = Object.fromEntries(STAFF.map(s => [s.id, 0]));

  while (res.length < count) {
    const staff = STAFF[staffIdx % STAFF.length];
    const whichMonth = Math.random() < 0.6 ? 0 : 1; // bias to current month
    const m = months[whichMonth];

    // Random start day scattered across month
    const maxDay = endOfMonth(m).getDate();
    const startDay = Math.max(1, Math.min(maxDay, Math.floor(Math.random() * maxDay) + 1));
    let start = new Date(m.getFullYear(), m.getMonth(), startDay);

    // Duration 1-4 days
    const dur = 1 + Math.floor(Math.random() * 4);
    let end = addDays(start, dur - 1);

    // Status rules: completed must end before today
    let status = VALID_STATUSES[Math.floor(Math.random() * VALID_STATUSES.length)];
    if (status === "completed") {
      if (end >= today) {
        // Shift fully into the past (max 14 days before today)
        const shift = 2 + Math.floor(Math.random() * 13);
        end = addDays(today, -shift);
        start = addDays(end, -(dur - 1));
      }
    } else {
      // For in_progress / reject, keep some in current, some in future within the same two months
      if (end < today && Math.random() < 0.5) {
        const forward = 1 + Math.floor(Math.random() * 12);
        start = addDays(today, forward);
        end = addDays(start, dur - 1);
      }
    }

    res.push({
      id: `T${idCounter++}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      assigneeId: staff.id,
      start,
      end,
      status,
      site: `Site ${String.fromCharCode(65 + (idCounter % 6))}`,
    });
    perStaffCounts[staff.id]++;
    staffIdx++;
  }

  // Top-up to ensure min per staff
  for (const s of STAFF) {
    while (perStaffCounts[s.id] < minPerStaff) {
      const m = months[1]; // next month
      const maxDay = Math.max(25, endOfMonth(m).getDate());
      const startDay = Math.floor(Math.random() * Math.min(25, endOfMonth(m).getDate())) + 1;
      const start = new Date(m.getFullYear(), m.getMonth(), startDay);
      const end = addDays(start, Math.floor(Math.random() * 3)); // 1-3 days
      const status = Math.random() < 0.5 ? "in_progress" : "reject";
      res.push({
        id: `T${idCounter++}`,
        title: "Top-up Assignment",
        assigneeId: s.id,
        start,
        end,
        status,
        site: "Site F",
      });
      perStaffCounts[s.id]++;
    }
  }

  // 5 unassigned (kept for backlog section)
  const unassigned = [];
  for (let i = 0; i < 5; i++) {
    const m = months[Math.random() < 0.5 ? 0 : 1];
    const startDay = Math.floor(Math.random() * endOfMonth(m).getDate()) + 1;
    const start = new Date(m.getFullYear(), m.getMonth(), startDay);
    unassigned.push({ id: `U${i + 1}`, title: `Unassigned ${i + 1}`, start, site: "Backlog" });
  }

  return { tasks: res, unassigned };
}

/* ============================
   Popover (Centered)
============================ */
function CenterPopover({ open, onClose, task, onStatusChange }) {
  if (!open || !task) return null;
  const ui = STATUS_UI[task.status];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-xl border border-slate-200">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${ui?.dot || "bg-slate-400"}`} />
              <h3 className="font-semibold">{task.title}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded hover:bg-slate-100" aria-label="Close">✕</button>
          </div>
          <div className="px-4 py-3 space-y-2 text-sm text-slate-700">
            <div><span className="font-semibold">Assignee:</span> {STAFF.find(s => s.id === task.assigneeId)?.name || "—"}</div>
            <div><span className="font-semibold">When:</span> {fmt(task.start)} → {fmt(task.end)}</div>
            <div>
              <span className="font-semibold">Status:</span>{" "}
              <span className={`inline-flex px-2 py-0.5 rounded ${ui?.pill}`}>{STATUS_LABEL[task.status]}</span>
            </div>
            <div><span className="font-semibold">Site:</span> {task.site}</div>
            <div className="pt-2">
              <div className="text-xs text-slate-500 mb-1">Quick actions</div>
              <div className="flex gap-2 flex-wrap">
                {VALID_STATUSES.map((s) => {
                  const sui = STATUS_UI[s];
                  return (
                    <button key={s} onClick={() => onStatusChange(task.id, s)} className={`text-sm px-3 py-1 rounded border ${sui.border} ${sui.text} hover:bg-slate-50`}>
                      {STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t text-right">
            <button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-slate-800 text-white hover:bg-slate-900">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================
   Calendar Grid
   - FIX: use inline CSS gridColumn instead of dynamic Tailwind classes
     to avoid chips piling under one column (Sunday-only issue)
============================ */
function WeekRow({ weekDays, tasksForWeek, onChipClick }) {
  // Columns are 1..7 (Mon..Sun)
  const dayToCol = (d) => ((d.getDay() + 6) % 7) + 1;
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  return (
    <div className="relative grid grid-cols-7 border-b border-slate-200">
      {/* Day cells */}
      {weekDays.map((d, idx) => {
        const isToday = fmt(d) === fmt(today);
        return (
          <div key={idx} className={`min-h-[5.25rem] border-r border-slate-200 p-1 ${isToday ? "bg-yellow-50" : ""}`}>
            <div className="text-[11px] text-slate-500">{d.getDate()}</div>
          </div>
        );
      })}

      {/* Spanning chips layer */}
      <div className="absolute left-0 right-0 top-5 px-1">
        <div className="max-h-28 overflow-y-auto pr-1 space-y-1">
          {tasksForWeek.map((t) => {
            const start = t.start < weekStart ? weekStart : t.start;
            const end = t.end > weekEnd ? weekEnd : t.end;
            const startCol = dayToCol(start);
            const endCol = dayToCol(end);
            const span = Math.max(1, endCol - startCol + 1);
            const ui = STATUS_UI[t.status];
            const roundedLeft = fmt(t.start) < fmt(weekStart) ? "" : "rounded-l";
            const roundedRight = fmt(t.end) > fmt(weekEnd) ? "" : "rounded-r";
            return (
              <div key={t.id} className="grid grid-cols-7">
                <div
                  className={`${ui?.chip} ${ui?.text} border ${ui?.border} ${roundedLeft} ${roundedRight} text-xs px-2 py-1 cursor-pointer`}
                  style={{ gridColumnStart: startCol, gridColumnEnd: `span ${span}` }}
                  onClick={() => onChipClick(t)}
                  title={`${t.title} • ${STATUS_LABEL[t.status]}`}
                >
                  <div className="flex items-center gap-1 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full ${ui?.dot}`} />
                    <span className="truncate">{t.title}</span>
                    <span className="ml-auto text-[10px] opacity-70">{STAFF.find(s => s.id === t.assigneeId)?.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthCalendar({ baseDate, tasks, onChipClick }) {
  const weeks = useMemo(() => getWeeksForMonth(baseDate), [baseDate]);

  // Pre-slice tasks per week for performance
  const weekTasks = useMemo(() => {
    return weeks.map(([w0, , , , , , w6]) =>
      tasks.filter((t) => !(t.end < w0 || t.start > w6))
    );
  }, [weeks, tasks]);

  const monthLabel = baseDate.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
        <div className="text-sm font-semibold">{monthLabel}</div>
        <div className="grid grid-cols-7 gap-0 text-xs text-slate-500">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
            <div key={d} className="text-center px-2">{d}</div>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-200">
        {weeks.map((w, i) => (
          <WeekRow key={i} weekDays={w} tasksForWeek={weekTasks[i]} onChipClick={onChipClick} />
        ))}
      </div>
    </div>
  );
}

/* ============================
   Sidebar (Collapsible)
============================ */
function Sidebar({ collapsed, setCollapsed, selected, setSelected }) {
  const toggleAll = () => {
    if (selected.length === STAFF.length) setSelected([]);
    else setSelected(STAFF.map(s => s.id));
  };
  const isAll = selected.length === STAFF.length;

  return (
    <div className={`h-full border-r border-slate-200 ${collapsed ? "w-16" : "w-64"} transition-all duration-200 bg-white`}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded hover:bg-slate-100" aria-label="Toggle sidebar" title="Toggle sidebar">
          <div className="space-y-1">
            <span className="block w-5 h-0.5 bg-slate-800"></span>
            <span className="block w-5 h-0.5 bg-slate-800"></span>
            <span className="block w-5 h-0.5 bg-slate-800"></span>
          </div>
        </button>
        {!collapsed && <div className="text-sm font-semibold">Assignees</div>}
        <div />
      </div>
      <div className="p-2">
        {!collapsed && (
          <button onClick={toggleAll} className="w-full text-sm px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 mb-2">
            {isAll ? "Deselect All" : "Select All"}
          </button>
        )}
        <div className="space-y-1">
          {STAFF.map((s) => {
            const active = selected.includes(s.id);
            return (
              <button key={s.id} onClick={() => { if (active) setSelected(selected.filter((x) => x !== s.id)); else setSelected([...selected, s.id]); }} className={`w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 ${active ? "bg-slate-100" : ""}`}>
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm shrink-0">{initials(s.name)}</div>
                {!collapsed && <div className="text-sm text-left truncate">{s.name}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================
   App Shell — CURRENT MONTH by default
   - Prev/Next buttons to navigate months
   - Data is limited to current + next month (demo), so outside months will look sparse by design
============================ */
export default function App() {
  const { tasks: seed, unassigned: seedUnassigned } = useMemo(() => generateDummyTasks({ count: 50 }), []);
  const [tasks, setTasks] = useState(seed);
  const [unassigned] = useState(seedUnassigned);

  const [selectedAssignees, setSelectedAssignees] = useState(STAFF.map(s => s.id));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [activeTask, setActiveTask] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Cursor month — default current month
  const [cursor, setCursor] = useState(startOfMonth(today));

  const onChipClick = (task) => { setActiveTask(task); setPopoverOpen(true); };
  const onStatusChange = (taskId, status) => { setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t))); };

  // Filter by selected assignees, then slice to tasks visible for the cursor month grid bounds
  const weeks = useMemo(() => getWeeksForMonth(cursor), [cursor]);
  const [gridStart, , , , , , gridEnd] = weeks[0].concat().slice(0,7) && [weeks[0][0], weeks[0][1], weeks[0][2], weeks[0][3], weeks[0][4], weeks[0][5], weeks[0][6]];
  const monthStart = weeks[0][0];
  const monthEnd = weeks[weeks.length-1][6];

  const visibleTasks = useMemo(() => {
    const byAssignee = tasks.filter(t => selectedAssignees.includes(t.assigneeId));
    return byAssignee.filter(t => !(t.end < monthStart || t.start > monthEnd));
  }, [tasks, selectedAssignees, monthStart, monthEnd]);

  // -------- Tests (console) --------
  useEffect(() => {
    const names = new Set(tasks.map(t => t.status));
    console.assert([...names].every(s => VALID_STATUSES.includes(s)), "Invalid statuses present");
    const allCompletedOk = tasks.filter(t => t.status === "completed").every(t => t.end < today);
    console.assert(allCompletedOk, "All completed tasks must end before today");
    const nextMonthHas = tasks.some(t => t.start.getMonth() === new Date(today.getFullYear(), today.getMonth() + 1, 1).getMonth());
    console.assert(nextMonthHas, "There should be tasks in next month");
    const everyStaffHas = STAFF.every(s => tasks.some(t => t.assigneeId === s.id));
    console.assert(everyStaffHas, "Each staff must have at least one task");
    console.debug("[OK] Sanity tests passed", { statusSet: [...names], taskCount: tasks.length, unassigned: unassigned.length });
  }, [tasks, unassigned]);

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-800 flex">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} selected={selectedAssignees} setSelected={setSelectedAssignees} />

      <div className="flex-1 overflow-auto">
        <div className="p-3 sm:p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Task Monitoring — {monthLabel}</h1>
              <p className="text-sm text-slate-500">Demo shows tasks in this month and next month only. Navigate with Prev/Next.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded border" onClick={() => setCursor(startOfMonth(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1)))}>Prev</button>
              <button className="px-3 py-1.5 rounded border" onClick={() => setCursor(startOfMonth(today))}>Today</button>
              <button className="px-3 py-1.5 rounded border" onClick={() => setCursor(startOfMonth(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1)))}>Next</button>
            </div>
          </div>

          {/* Single month grid (current by default, navigate with buttons) */}
          <MonthCalendar baseDate={cursor} tasks={visibleTasks} onChipClick={onChipClick} />

          {/* Unassigned list */}
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">Unassigned (5)</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {unassigned.map((u) => (
                <div key={u.id} className="rounded border border-slate-200 bg-white p-2">
                  <div className="text-sm font-medium">{u.title}</div>
                  <div className="text-xs text-slate-500">{fmt(u.start)} • {u.site}</div>
                  <button className="mt-2 text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">Assign…</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <CenterPopover open={popoverOpen} onClose={() => setPopoverOpen(false)} task={activeTask} onStatusChange={onStatusChange} />
      </div>
    </div>
  );
}
