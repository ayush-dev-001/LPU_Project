"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR } from "@/lib/utils";

// Same palette as the dashboard charts: one series colour, the reserved red only for over budget.
const C = {
  series: "#5b9cf6",
  critical: "#f06262",
  grid: "#26262b",
  axis: "#8e8c91",
};

const axisTick = { fill: C.axis, fontSize: 12 };

/** Short rupee labels for axes: ₹950, ₹45k, ₹4.5L, ₹1.2Cr. */
function compactINR(v: number) {
  if (v >= 10_000_000) return `₹${+(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${+(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${+(v / 1_000).toFixed(0)}k`;
  return `₹${v}`;
}

function TooltipBox({ title, color, label, value }: { title: string; color: string; label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-slate-900">{title}</p>
      <p className="flex items-center gap-2 text-slate-600">
        <span className="size-2.5 rounded-sm" style={{ background: color }} aria-hidden />
        <span className="flex-1">{label}</span>
        <span className="font-medium tabular-nums text-slate-900">{value}</span>
      </p>
    </div>
  );
}

function DataTable({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-slate-500 hover:text-slate-800">View as table</summary>
      <table className="mt-2 w-full text-left text-xs">
        <thead className="text-slate-500">
          <tr>
            <th className="py-1 font-medium">{head[0]}</th>
            <th className="py-1 text-right font-medium">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a} className="border-t border-slate-100">
              <td className="py-1">{a}</td>
              <td className="py-1 text-right tabular-nums">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

// ─────────────── Spend by category ───────────────

export type CategoryDatum = { label: string; amount: number };

export function CategoryChart({ data }: { data: CategoryDatum[] }) {
  return (
    <div>
      <div style={{ height: Math.max(160, data.length * 40 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid horizontal={false} stroke={C.grid} />
            <XAxis type="number" tickFormatter={compactINR} tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" width={84} tick={axisTick} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#1f1f23" }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as CategoryDatum | undefined;
                if (!active || !d) return null;
                return <TooltipBox title={d.label} color={C.series} label="Spent" value={formatINR(d.amount)} />;
              }}
            />
            <Bar dataKey="amount" name="Spent" fill={C.series} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable head={["Category", "Spent"]} rows={data.map((d) => [d.label, formatINR(d.amount)])} />
    </div>
  );
}

// ─────────────── Cumulative spend by month ───────────────

export type CumulativeDatum = { month: string; total: number };

export function CumulativeChart({ data, budget }: { data: CumulativeDatum[]; budget: number }) {
  const last = data.at(-1)?.total ?? 0;
  const over = budget > 0 && last > budget;
  const color = over ? C.critical : C.series;
  const top = Math.max(budget, last) * 1.1 || 1;

  return (
    <div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke={C.grid} />
            <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} />
            <YAxis
              domain={[0, top]}
              tickFormatter={compactINR}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            {budget > 0 ? (
              <ReferenceLine
                y={budget}
                stroke={C.axis}
                strokeDasharray="4 4"
                label={{ value: `Budget ${compactINR(budget)}`, position: "insideTopLeft", fill: C.axis, fontSize: 12 }}
              />
            ) : null}
            <Tooltip
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as CumulativeDatum | undefined;
                if (!active || !d) return null;
                return <TooltipBox title={d.month} color={color} label="Spent to date" value={formatINR(d.total)} />;
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Spent to date"
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={0.12}
              dot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <DataTable head={["Month", "Spent to date"]} rows={data.map((d) => [d.month, formatINR(d.total)])} />
    </div>
  );
}
