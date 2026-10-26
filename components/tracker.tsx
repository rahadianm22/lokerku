"use client";

import { X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useHotkey } from "@/hooks/use-hotkey";
import { useNow } from "@/hooks/use-now";
import { download, parseBackup, toBackup } from "@/lib/backup";
import { toCsv } from "@/lib/csv";
import { matchesQuery, sortJobs, todayYmd, type SortKey } from "@/lib/format";
import { parseShared } from "@/lib/share";
import { useStore } from "@/lib/store";
import { STATUS_LABEL, type Draft, type Job, type Status } from "@/lib/types";
import { AddJobDialog, type DialogMode } from "./add-job/add-job-dialog";
import { EmptyState, NoResults } from "./empty-state";
import type { Filter } from "./filter-pills";
import { Header } from "./header";
import { JobCardList } from "./job-card-list";
import { JobTable } from "./job-table";
import { StatsRow } from "./stats-row";
import { SettingsDialog } from "./settings-dialog";
import { SyncStatus } from "./sync-status";
import { useToast } from "./toast";
import { Toolbar } from "./toolbar";

const GUEST_NOTE_KEY = "lokerku.guestNoteHidden";
const login = () => signIn("google", { callbackUrl: "/app" });

const SYNC_ERRORS = {
  scope: {
    title: "Lokerku belum diberi izin menyimpan ke Google Drive",
    body: "Masuk lagi dan centang izin untuk file Google Drive yang dibuat Lokerku. Izin ini tidak membuka file lain di Drive-mu.",
    action: "Beri izin",
    relogin: true,
  },
  auth: {
    title: "Sesi Google kamu berakhir",
    body: "Perubahanmu tetap tersimpan di perangkat ini. Masuk lagi untuk melanjutkan sinkron.",
    action: "Masuk lagi",
    relogin: true,
  },
  google: {
    title: "Google Sheet tidak bisa dibuka",
    body: "Perubahanmu tetap tersimpan di perangkat ini. Lokerku akan mencoba lagi otomatis.",
    action: "Coba lagi",
    relogin: false,
  },
  network: {
    title: "Gagal menyimpan ke Google Sheet",
    body: "Perubahanmu aman di perangkat ini dan akan dikirim lagi otomatis.",
    action: "Coba lagi",
    relogin: false,
  },
} as const;

function SyncNotice() {
  const { sync, syncNow } = useStore();
  if (sync.kind !== "error") return null;
  const e = SYNC_ERRORS[sync.error === "rate" ? "network" : sync.error];
  return (
    <div className="notice danger" role="alert">
      <div>
        <strong>{e.title}</strong>
        <p>{e.body}</p>
      </div>
      <button type="button" className={`btn btn-sm ${e.relogin ? "btn-ink" : "btn-ghost"}`} onClick={e.relogin ? login : syncNow}>
        {e.action}
      </button>
    </div>
  );
}

const readGuestNoteHidden = () => {
  try {
    return localStorage.getItem(GUEST_NOTE_KEY) === "1";
  } catch {
    return false;
  }
};
const noSubscribe = () => () => {};

function GuestNotice() {
  // Server merender tanpa pemberitahuan; browser membaca preferensi dari localStorage.
  const stored = useSyncExternalStore(noSubscribe, readGuestNoteHidden, () => true);
  const [dismissed, setHidden] = useState(false);
  if (stored || dismissed) return null;
  return (
    <div className="notice">
      <div>
        <strong>Kamu sedang di mode tamu</strong>
        <p>Loker hanya tersimpan di browser ini. Masuk dengan Google supaya tersimpan di Google Sheet milikmu dan bisa dibuka dari HP atau laptop lain.</p>
      </div>
      <div className="m-foot-r">
        <button type="button" className="btn btn-ink btn-sm" onClick={login}>
          Masuk dengan Google
        </button>
        <button
          type="button"
          className="close"
          aria-label="Sembunyikan pemberitahuan"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(GUEST_NOTE_KEY, "1");
            } catch {
              /* cukup disembunyikan untuk sesi ini */
            }
          }}
        >
          <X className="ic" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function Tracker() {
  const store = useStore();
  const { jobs, ready, account, authEnabled } = store;
  const toast = useToast();
  const now = useNow();

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("new");
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (store.notice) {
      toast(store.notice);
      store.clearNotice();
    }
  }, [store, toast]);

  const counts = useMemo(() => {
    const c = { all: jobs.length } as Record<Filter, number>;
    for (const j of jobs) c[j.status] = (c[j.status] ?? 0) + 1;
    return c;
  }, [jobs]);

  const visible = useMemo(
    () => sortJobs(jobs.filter((j) => (filter === "all" || j.status === filter) && matchesQuery(j, q)), sort, now),
    [jobs, filter, q, sort, now],
  );

  const flash = useCallback((id: string) => {
    clearTimeout(flashTimer.current);
    setFlashId(id);
    flashTimer.current = setTimeout(() => setFlashId(null), 2400);
  }, []);

  const openDialog = useCallback((mode: DialogMode) => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setDialog(mode);
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(null);
    // Kembalikan fokus ke tombol pemicu setelah animasi keluar dimulai.
    // Dibuka lewat hotkey (fokus di body): kembalikan ke tombol Tambah.
    const back = returnFocus.current;
    requestAnimationFrame(() => (back?.isConnected && back !== document.body ? back : addRef.current)?.focus());
  }, []);

  const openAdd = useCallback(() => openDialog({ kind: "add" }), [openDialog]);

  // Dibuka dari menu "Bagikan" aplikasi lain: /app?url=…&text=…&title=… langsung membuka dialog Tambah loker.
  const sharedOnce = useRef(false);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (sharedOnce.current) return;
      sharedOnce.current = true;
      const p = new URLSearchParams(window.location.search);
      const shared = parseShared(p.get("url"), p.get("text"), p.get("title"));
      if (!shared) return;
      window.history.replaceState(null, "", window.location.pathname);
      openDialog({ kind: "add", shared });
    }, 0);
    return () => clearTimeout(t);
  }, [ready, openDialog]);
  useHotkey("n", openAdd, ready && !dialog && !settingsOpen);
  useHotkey("/", () => searchRef.current?.focus(), ready && !dialog && !settingsOpen);

  const menuRef = useRef<HTMLElement | null>(null);
  const openSettings = useCallback(() => {
    // Menu ⋯ sudah menutup dan mengembalikan fokus ke pemicunya; simpan itu untuk dipulihkan nanti.
    menuRef.current = document.activeElement as HTMLElement | null;
    setSettingsOpen(true);
  }, []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    const back = menuRef.current;
    requestAnimationFrame(() => (back?.isConnected && back !== document.body ? back : addRef.current)?.focus());
  }, []);

  async function deleteAll() {
    if (!window.confirm(`Hapus semua ${jobs.length} loker? Ini juga menghapusnya dari Google Sheet.`)) return;
    const before = await store.replaceAll([]);
    closeSettings();
    toast(`${before.length} loker dihapus`, () => store.replaceAll(before));
  }

  async function handleSave(draft: Draft, editing: Job | null) {
    if (editing) {
      await store.update(editing.id, draft);
      closeDialog();
      flash(editing.id);
      toast("Perubahan disimpan");
      return;
    }
    const t = Date.now();
    const job: Job = { ...draft, id: crypto.randomUUID(), createdAt: t, updatedAt: t };
    await store.add(job);
    if (filter !== "all" && filter !== job.status) setFilter("all");
    setQ("");
    setSort("new");
    closeDialog();
    flash(job.id);
    toast("Loker disimpan ke tabel", () => store.remove(job.id));
  }

  async function handleStatus(job: Job, status: Status) {
    await store.update(job.id, { status });
    toast(`Status diubah ke ${STATUS_LABEL[status]}`);
  }

  async function handleDelete(job: Job) {
    const prev = await store.remove(job.id);
    if (prev) toast("Loker dihapus", () => store.revive(prev).then(() => flash(prev.id)));
  }

  function showExisting(job: Job) {
    closeDialog();
    setFilter("all");
    setQ("");
    flash(job.id);
    requestAnimationFrame(() => document.querySelector(".row-new")?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  function exportCsv() {
    download(`lokerku-${todayYmd()}.csv`, toCsv(sortJobs(jobs, "new")), "text/csv;charset=utf-8");
    toast(`${jobs.length} loker diekspor ke CSV`);
  }

  function backup() {
    download(`lokerku-backup-${todayYmd()}.json`, toBackup(jobs), "application/json");
    toast("Backup JSON dibuat");
  }

  async function restore(file: File) {
    const list = parseBackup(await file.text());
    if (!list) {
      toast("File backup tidak dikenali");
      return;
    }
    if (jobs.length && !window.confirm(`Ganti ${jobs.length} loker yang ada dengan ${list.length} loker dari backup?`)) return;
    const before = await store.replaceAll(list);
    toast(`${list.length} loker dipulihkan`, () => store.replaceAll(before));
  }

  const handlers = { onStatus: handleStatus, onEdit: (j: Job) => openDialog({ kind: "edit", job: j }), onDelete: handleDelete };

  return (
    <main className="page">
      <Header
        addRef={addRef}
        onAdd={openAdd}
        onExportCsv={exportCsv}
        onBackup={backup}
        onRestoreFile={restore}
        account={account}
        authEnabled={authEnabled}
        sheetUrl={store.sheetUrl}
        onLogin={login}
        onLogout={store.logout}
        onSyncNow={store.syncNow}
        onSettings={openSettings}
      />

      {account && <SyncNotice />}

      <StatsRow jobs={jobs} now={now} />

      <section className="tcard" aria-label="Daftar loker" aria-busy={!ready}>
        <Toolbar ref={searchRef} filter={filter} counts={counts} onFilter={setFilter} q={q} onQ={setQ} sort={sort} onSort={setSort} />
        {!ready ? (
          <div style={{ padding: 16, display: "grid", gap: 10 }} role="status" aria-label="Memuat loker">
            {[0, 1, 2].map((i) => (
              <div key={i} className="sk" style={{ height: 52, borderRadius: 10 }} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : visible.length === 0 ? (
          <NoResults
            onReset={() => {
              setFilter("all");
              setQ("");
            }}
          />
        ) : (
          <>
            <JobTable jobs={visible} now={now} flashId={flashId} {...handlers} />
            <JobCardList jobs={visible} now={now} flashId={flashId} {...handlers} />
          </>
        )}
      </section>

      <footer className="ft">
        <span className="mono">
          Menampilkan {visible.length} dari {jobs.length} loker
        </span>
        <SyncStatus state={store.sync} now={now} sheetUrl={store.sheetUrl} />
      </footer>

      {/* Di bawah tabel, bukan di atas: muncul setelah halaman siap, jadi di atas akan menggeser seluruh tabel (CLS). */}
      {!account && authEnabled && ready && (
        <div style={{ marginTop: 16 }}>
          <GuestNotice />
        </div>
      )}

      <AnimatePresence>
        {dialog && (
          <AddJobDialog
            key={dialog.kind === "edit" ? dialog.job.id : "add"}
            mode={dialog}
            jobs={jobs}
            settings={store.settings}
            onClose={closeDialog}
            onSave={handleSave}
            onShowExisting={showExisting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsDialog
            account={account}
            authEnabled={authEnabled}
            settings={store.settings}
            onSettings={store.saveSettings}
            sheetUrl={store.sheetUrl}
            sync={store.sync}
            jobCount={jobs.length}
            onSyncNow={store.syncNow}
            onSwitchAccount={store.switchAccount}
            onDeleteAll={deleteAll}
            onClose={closeSettings}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
