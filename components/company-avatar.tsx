"use client";

import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { avatarTint, initial } from "@/lib/format";
import { safeHref } from "@/lib/url";

export function CompanyAvatar({ name, logoUrl, size = 38 }: { name: string; logoUrl?: string; size?: number }) {
  const { dark } = useTheme();
  const [broken, setBroken] = useState<string | null>(null);
  const src = safeHref(logoUrl);
  const [bg, fg] = avatarTint(name, dark);
  const style = { width: size, height: size, borderRadius: size >= 44 ? 12 : 10, fontSize: size * 0.4, background: bg, color: fg };

  return (
    <div className="av" style={style} aria-hidden="true">
      {src && broken !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(src)} />
      ) : (
        initial(name)
      )}
    </div>
  );
}
