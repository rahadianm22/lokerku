"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import type { Job } from "@/lib/types";
import { daysLeft } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";

export function StatsBar({ jobs }: { jobs: Job[] }) {
  const stats = useMemo(() => {
    const now = Date.now();
    const week = now - 7 * 86400000;
    return [
      { label: "Total loker", value: jobs.length, highlight: true },
      { label: "Masuk 7 hari", value: jobs.filter((j) => new Date(j.addedAt).getTime() > week).length },
      { label: "Sudah apply", value: jobs.filter((j) => ["applied", "interview", "offer"].includes(j.status)).length },
      { label: "Interview", value: jobs.filter((j) => j.status === "interview").length },
      {
        label: "Deadline ≤ 3 hari",
        value: jobs.filter((j) => {
          const d = daysLeft(j.deadline, now);
          return d !== null && d >= 0 && d <= 3 && ["saved"].includes(j.status);
        }).length,
        warn: true,
      },
    ];
  }, [jobs]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, type: "spring", stiffness: 260, damping: 24 }}
          className={`rounded-[var(--radius)] border p-4 ${
            s.highlight ? "border-ink bg-ink text-bg" : "border-line bg-surface"
          } ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}
        >
          <div className={`text-xs ${s.highlight ? "opacity-70" : "text-muted"}`}>{s.label}</div>
          <div
            className={`mt-1 font-mono text-3xl font-semibold tracking-tight ${
              s.warn && s.value > 0 ? "text-danger" : ""
            }`}
          >
            <AnimatedNumber value={s.value} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
