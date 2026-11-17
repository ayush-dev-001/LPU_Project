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
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

type CategoryDatum = { category: string; amount: number };
type CumulativeDatum = { month: string; spend: number };

const axis = { fill: "#64748b", fontSize: 11 };

function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-900">{label}</p>
      <p className="mt-1 text-slate-700">{formatINR(Number(payload[0]?.value ?? 0))}</p>
    </div>
  );
}

export function BudgetCharts({
  categories,
  cumulative,
  budget,
}: {
  categories: CategoryDatum[];
  cumulative: CumulativeDatum[];
  budget: number;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Spend by category" description="Categories with recorded spend" />
        <CardBody>
        {categories.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center rounded-md bg-slate-50 text-sm text-slate-500">No category spend yet</div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(value: number) => formatINR(value)} tick={axis} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis type="category" dataKey="category" width={86} tick={axis} tickLine={false} axisLine={false} />
                <Tooltip content={<MoneyTooltip />} />
                <Bar dataKey="amount" fill="#4f46e5" radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Cumulative spend over time" description="Monthly accumulated expense against the budget" />
        <CardBody>
        {cumulative.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center rounded-md bg-slate-50 text-sm text-slate-500">No expenses to chart</div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulative} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tickFormatter={(value: number) => formatINR(value)} tick={axis} tickLine={false} axisLine={false} width={78} />
                <Tooltip content={<MoneyTooltip />} />
                {budget > 0 ? <ReferenceLine y={budget} stroke="#64748b" strokeDasharray="5 4" label={{ value: "Budget", fill: "#64748b", fontSize: 10 }} /> : null}
                <Area type="monotone" dataKey="spend" stroke="#4f46e5" fill="#c7d2fe" fillOpacity={0.65} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        </CardBody>
      </Card>
    </div>
  );
}
