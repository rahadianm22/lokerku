"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
const KEY = "lokerku.theme";

/** Skrip kecil di <head> supaya tema terpasang sebelum halaman tampil (tanpa kedip). */
export const themeScript = `(function(){try{var p=localStorage.getItem('${KEY}');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onMq = () => {
    if (read() === "system") apply("system");
    fn();
  };
  mq.addEventListener("change", onMq);
  return () => {
    listeners.delete(fn);
    mq.removeEventListener("change", onMq);
  };
}

const isDarkNow = () => document.documentElement.classList.contains("dark");

/** Preferensi tema: Terang, Gelap, atau ikut sistem. */
export function useThemePref() {
  const pref = useSyncExternalStore(subscribe, read, (): ThemePref => "system");
  const setPref = useCallback((next: ThemePref) => {
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* tetap berlaku untuk sesi ini */
    }
    apply(next);
    listeners.forEach((l) => l());
  }, []);
  return { pref, setPref };
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, isDarkNow, () => false);
  const toggle = useCallback(() => {
    const next: ThemePref = isDarkNow() ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* tetap ganti untuk sesi ini */
    }
    apply(next);
    listeners.forEach((l) => l());
  }, []);
  return { dark, toggle };
}
