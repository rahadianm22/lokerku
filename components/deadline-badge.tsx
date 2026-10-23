import { deadlineBadge } from "@/lib/format";
import type { Status } from "@/lib/types";

const CLS = { urgent: "dl-urgent", past: "dl-past", far: "dl-far" } as const;

export function DeadlineBadge({ deadline, status, now }: { deadline: string | null; status: Status; now: number }) {
  const b = deadlineBadge(deadline, status, now);
  if (!b) return null;
  return <span className={`badge ${CLS[b.tone]}`}>{b.label}</span>;
}
