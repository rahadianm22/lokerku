"use client";

import { ExternalLink, RefreshCw, Trash2, UserRoundCog } from "lucide-react";
import { useThemePref, type ThemePref } from "@/hooks/use-theme";
import { useNow } from "@/hooks/use-now";
import type { Settings } from "@/lib/settings";
import type { Account, SyncState } from "@/lib/store";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, type Priority, type Status } from "@/lib/types";
import { Segmented } from "./add-job/segmented";
import { Dialog } from "./dialog";
import { LoginButton } from "./login-button";
import { SyncStatus } from "./sync-status";

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
  { value: "system", label: "Ikuti sistem" },
];

function Switch({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="set-row">
      <div>
        <label htmlFor={id} className="set-label">
          {label}
        </label>
        <p id={`${id}-hint`} className="set-hint">
          {hint}
        </p>
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} aria-describedby={`${id}-hint`} className="switch" onClick={() => onChange(!checked)}>
        <span className="switch-knob" aria-hidden="true" />
      </button>
    </div>
  );
}

export function SettingsDialog({
  account,
  authEnabled,
  settings,
  onSettings,
  sheetUrl,
  sync,
  jobCount,
  onSyncNow,
  onSwitchAccount,
  onDeleteAll,
  onClose,
}: {
  account: Account | null;
  authEnabled: boolean;
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  sheetUrl: string | null;
  sync: SyncState;
  jobCount: number;
  onSyncNow: () => void;
  onSwitchAccount: () => void;
  onDeleteAll: () => void;
  onClose: () => void;
}) {
  const { pref, setPref } = useThemePref();
  const now = useNow();

  return (
    <Dialog
      eyebrow="Lokerku"
      title="Pengaturan"
      onClose={onClose}
      footer={
        <>
          <span className="set-hint" style={{ margin: 0 }}>
            Pengaturan ini tersimpan di perangkat ini.
          </span>
          <button type="button" className="btn btn-ink" onClick={onClose}>
            Selesai
          </button>
        </>
      }
    >
      <section className="set-sec" aria-labelledby="set-akun">
        <h3 id="set-akun">Akun</h3>
        {account ? (
          <>
            <div className="set-account">
              <span className="set-label">Masuk sebagai</span>
              <strong className="mono" style={{ fontSize: 13.5, overflowWrap: "anywhere" }}>
                {account.email ?? account.name}
              </strong>
            </div>
            <p className="set-hint">
              Email mengikuti akun Google dan tidak bisa diubah dari sini. Untuk memakai email lain, ganti akun. Loker di
              akun ini tetap aman di Google Sheet-nya.
            </p>
            <div className="set-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onSwitchAccount}>
                <UserRoundCog className="ic" strokeWidth={1.75} aria-hidden />
                Ganti akun Google
              </button>
              {sheetUrl && (
                <a className="btn btn-ghost btn-sm" href={sheetUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="ic" strokeWidth={1.75} aria-hidden />
                  Buka Google Sheet
                </a>
              )}
              <a className="btn btn-ghost btn-sm" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="ic" strokeWidth={1.75} aria-hidden />
                Kelola izin di Google
              </a>
            </div>
            <div className="set-sync">
              <SyncStatus state={sync} now={now} sheetUrl={null} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={onSyncNow}>
                <RefreshCw className="ic" strokeWidth={1.75} aria-hidden />
                Sinkron sekarang
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="set-hint" style={{ marginTop: 0 }}>
              Kamu di mode tamu, jadi loker hanya tersimpan di browser ini.
              {authEnabled && " Masuk dengan Google supaya tersimpan di Google Sheet milikmu dan bisa dibuka dari perangkat lain."}
            </p>
            {authEnabled && (
              <div className="set-actions">
                <LoginButton className="btn btn-ink btn-sm" />
              </div>
            )}
          </>
        )}
      </section>

      <section className="set-sec" aria-labelledby="set-tambah">
        <h3 id="set-tambah">Tambah loker</h3>
        <Switch
          id="set-auto"
          checked={settings.autoSave}
          onChange={(v) => onSettings({ autoSave: v })}
          label="Simpan otomatis setelah data terbaca"
          hint="Tempel link, datanya diambil dan langsung disimpan. Kalau halaman tidak terbaca, atau perusahaan dan posisinya kosong, form tetap dibuka supaya kamu bisa melengkapinya."
        />
        <div className="set-grid">
          <div className="fld">
            <label htmlFor="set-status">Status awal</label>
            <div className="sel-wrap full">
              <select id="set-status" className="inp" value={settings.defaultStatus} onChange={(e) => onSettings({ defaultStatus: e.target.value as Status })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </div>
          </div>
          <div className="fld">
            <span className="flbl" id="set-pri">
              Prioritas awal
            </span>
            <Segmented<Priority>
              id="set-pri"
              labelledBy="set-pri"
              value={settings.defaultPriority}
              options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
              onChange={(v) => onSettings({ defaultPriority: v })}
            />
          </div>
        </div>
      </section>

      <section className="set-sec" aria-labelledby="set-tampilan">
        <h3 id="set-tampilan">Tampilan</h3>
        <span className="flbl" id="set-tema">
          Tema
        </span>
        <div style={{ marginTop: 6 }}>
          <Segmented<ThemePref> id="tema" labelledBy="set-tema" value={pref} options={THEMES} onChange={setPref} />
        </div>
      </section>

      <section className="set-sec set-danger" aria-labelledby="set-data">
        <h3 id="set-data">Data</h3>
        <div className="set-row">
          <div>
            <span className="set-label">Hapus semua loker</span>
            <p className="set-hint">
              {jobCount
                ? `Menghapus ${jobCount} loker dari tabel${account ? " dan dari Google Sheet" : ""}. Bisa dibatalkan selama beberapa detik setelahnya.`
                : "Belum ada loker untuk dihapus."}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm set-del" onClick={onDeleteAll} disabled={!jobCount}>
            <Trash2 className="ic" strokeWidth={1.75} aria-hidden />
            Hapus semua
          </button>
        </div>
      </section>
    </Dialog>
  );
}

function ChevronIcon() {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
