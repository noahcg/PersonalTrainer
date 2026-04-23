"use client";

import { useSyncExternalStore } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { progress } from "@/lib/demo-data";

export function ProgressChart() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="h-72 w-full rounded-[1.5rem] bg-stone-100/70" />;
  }

  return (
    <div className="h-72 min-w-0 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={progress} margin={{ left: -18, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="adherence" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#788d63" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#788d63" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ded4c6" strokeDasharray="4 8" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#817463", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#817463", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              border: "1px solid #ded4c6",
              borderRadius: 18,
              background: "rgba(255,250,241,0.94)",
              boxShadow: "0 24px 70px -36px rgba(32,29,24,.35)",
            }}
          />
          <Area type="monotone" dataKey="adherence" stroke="#788d63" strokeWidth={3} fill="url(#adherence)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
