"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Chart palette: categorical slots 1–2 for series, the reserved "critical" status red for overdue.
const C = {
  series1: "#2a78d6",
  series2: "#eb6834",
  critical: "#d03b3b",
  grid: "#e2e8f0",
  axis: "#64748b",
  surface: "#ffffff",
};

const axisTick = { fill: C.axis, fontSize: 12 };

function TooltipBox({ title, rows }: { title: string; rows: { color: string; label: string; value: string }[] }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-soft">
      <p className="mb-1 font-medium text-slate-900">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-slate-600">
          <span className="size-2.5 rounded-sm" style={{ background: r.color }} aria-hidden />
          <span className="flex-1">{r.label}</span>
          <span className="font-medium tabular-nums text-slate-900">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

function LegendRow({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 pb-2 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// ─────────────── Work done vs budget used (per running project) ───────────────

export type ProgressBudgetDatum = { code: string; name: string; done: number; budgetUsed: number | null };

export function ProgressBudgetChart({ data }: { data: ProgressBudgetDatum[] }) {
  const max = Math.max(100, ...data.map((d) => d.budgetUsed ?? 0));
  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={C.grid} />
            <XAxis dataKey="code" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} />
            <YAxis
              domain={[0, Math.ceil(max / 25) * 25]}
              tickFormatter={(v: number) => `${v}%`}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine y={100} stroke={C.axis} strokeDasharray="4 4" />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as ProgressBudgetDatum | undefined;
                if (!active || !d) return null;
                return (
                  <TooltipBox
                    title={`${d.code} · ${d.name}`}
                    rows={[
                      { color: C.series1, label: "Work done", value: `${d.done}%` },
                      { color: C.series2, label: "Budget used", value: d.budgetUsed == null ? "No budget" : `${d.budgetUsed}%` },
                    ]}
                  />
                );
              }}
            />
            <Legend
              verticalAlign="top"
              content={() => (
                <LegendRow
                  items={[
                    { color: C.series1, label: "Work done (tasks)" },
                    { color: C.series2, label: "Budget used" },
                  ]}
                />
              )}
            />
            <Bar dataKey="done" name="Work done" fill={C.series1} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="budgetUsed" name="Budget used" fill={C.series2} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-800">View as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 font-medium">Project</th>
              <th className="py-1 text-right font-medium">Work done</th>
              <th className="py-1 text-right font-medium">Budget used</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.code} className="border-t border-slate-100">
                <td className="py-1">{d.code} · {d.name}</td>
                <td className="py-1 text-right tabular-nums">{d.done}%</td>
                <td className="py-1 text-right tabular-nums">{d.budgetUsed == null ? "—" : `${d.budgetUsed}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// ─────────────── Open tasks per person ───────────────

export type WorkloadDatum = { name: string; onTime: number; overdue: number };

export function WorkloadChart({ data }: { data: WorkloadDatum[] }) {
  return (
    <div>
      <div style={{ height: Math.max(160, data.length * 40 + 60) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid horizontal={false} stroke={C.grid} />
            <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={110} tick={axisTick} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as WorkloadDatum | undefined;
                if (!active || !d) return null;
                return (
                  <TooltipBox
                    title={d.name}
                    rows={[
                      { color: C.series1, label: "Open, on time", value: String(d.onTime) },
                      { color: C.critical, label: "Overdue", value: String(d.overdue) },
                    ]}
                  />
                );
              }}
            />
            <Legend
              verticalAlign="top"
              content={() => (
                <LegendRow
                  items={[
                    { color: C.series1, label: "Open, on time" },
                    { color: C.critical, label: "Overdue" },
                  ]}
                />
              )}
            />
            {/* White stroke = 2px gap between stacked segments */}
            <Bar dataKey="onTime" stackId="t" fill={C.series1} stroke={C.surface} strokeWidth={2} maxBarSize={22} />
            <Bar
              dataKey="overdue"
              stackId="t"
              fill={C.critical}
              stroke={C.surface}
              strokeWidth={2}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-800">View as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 font-medium">Person</th>
              <th className="py-1 text-right font-medium">On time</th>
              <th className="py-1 text-right font-medium">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.name} className="border-t border-slate-100">
                <td className="py-1">{d.name}</td>
                <td className="py-1 text-right tabular-nums">{d.onTime}</td>
                <td className="py-1 text-right tabular-nums">{d.overdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// ─────────────── Projects by status (donut) ───────────────

export type StatusSlice = { key: string; label: string; count: number; color: string };

export function ProjectStatusDonut({ data, total }: { data: StatusSlice[]; total: number }) {
  const slices = data.filter((d) => d.count > 0);
  return (
    <div className="relative size-44 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="count"
            nameKey="label"
            innerRadius="72%"
            outerRadius="100%"
            paddingAngle={slices.length > 1 ? 3 : 0}
            cornerRadius={8}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as StatusSlice | undefined;
              if (!active || !d) return null;
              return <TooltipBox title={d.label} rows={[{ color: d.color, label: "Projects", value: String(d.count) }]} />;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{total}</span>
        <span className="text-xs text-slate-500">Total projects</span>
      </div>
    </div>
  );
}

// ─────────────── Weekly activity (last 7 days) ───────────────

export type DayActivity = { day: string; date: string; tasksDone: number; updates: number };

const W = { tasks: "#3dbd8c", updates: "#b3a6f7" };

export function WeeklyActivityChart({ data }: { data: DayActivity[] }) {
  return (
    <div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barGap={3} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#efebe7" />
            <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#f6f3f0", radius: 8 }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as DayActivity | undefined;
                if (!active || !d) return null;
                return (
                  <TooltipBox
                    title={d.date}
                    rows={[
                      { color: W.tasks, label: "Tasks done", value: String(d.tasksDone) },
                      { color: W.updates, label: "Updates posted", value: String(d.updates) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="tasksDone" name="Tasks done" fill={W.tasks} radius={[6, 6, 6, 6]} maxBarSize={14} />
            <Bar dataKey="updates" name="Updates posted" fill={W.updates} radius={[6, 6, 6, 6]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <LegendRow
        items={[
          { color: W.tasks, label: "Tasks done" },
          { color: W.updates, label: "Updates posted" },
        ]}
      />
    </div>
  );
}
