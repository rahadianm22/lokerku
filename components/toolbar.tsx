"use client";

import { ChevronDown, Search } from "lucide-react";
import { forwardRef } from "react";
import type { SortKey } from "@/lib/format";
import { FilterPills, type Filter } from "./filter-pills";

interface Props {
  filter: Filter;
  counts: Record<Filter, number>;
  onFilter: (f: Filter) => void;
  q: string;
  onQ: (q: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
}

export const Toolbar = forwardRef<HTMLInputElement, Props>(function Toolbar({ filter, counts, onFilter, q, onQ, sort, onSort }, searchRef) {
  return (
    <div className="toolbar">
      <FilterPills value={filter} counts={counts} onChange={onFilter} />
      <div className="tools">
        <div className="search">
          <label className="sr-only" htmlFor="lk-q">
            Cari loker
          </label>
          <Search className="ic" strokeWidth={1.75} aria-hidden />
          <input
            ref={searchRef}
            id="lk-q"
            className="inp"
            type="search"
            placeholder="Cari perusahaan, posisi…"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && q) {
                e.preventDefault();
                onQ("");
              }
            }}
            aria-keyshortcuts="/"
          />
        </div>
        <div className="sel-wrap">
          <label className="sr-only" htmlFor="lk-sort">
            Urutkan
          </label>
          <select id="lk-sort" className="inp sort" value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
            <option value="new">Terbaru</option>
            <option value="deadline">Deadline terdekat</option>
            <option value="priority">Prioritas</option>
            <option value="az">Perusahaan A–Z</option>
          </select>
          <ChevronDown className="ic" strokeWidth={1.75} aria-hidden />
        </div>
      </div>
    </div>
  );
});
