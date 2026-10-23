"use client";

import { useState } from "react";
import { hueFrom, initials } from "@/lib/format";

export function CompanyAvatar({
  name,
  logo,
  size = 36,
}: {
  name: string;
  logo?: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const hue = hueFrom(name || "?");
  const style = { width: size, height: size, borderRadius: size * 0.3 };

  if (logo && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        style={style}
        onError={() => setBroken(true)}
        className="shrink-0 border border-line bg-white object-contain p-0.5"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        ...style,
        fontSize: size * 0.36,
        background: `oklch(0.92 0.06 ${hue})`,
        color: `oklch(0.35 0.09 ${hue})`,
      }}
      className="grid shrink-0 place-items-center font-semibold tracking-tight"
    >
      {initials(name)}
    </span>
  );
}
