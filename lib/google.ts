import "server-only";
import { HEADER, SHEET_TITLE } from "./sheet-codec";

const DRIVE = "https://www.googleapis.com/drive/v3/files";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const APP_PROP = { key: "lokerku", value: "jobs" };
const LAST_COL = String.fromCharCode(64 + HEADER.length); // 20 kolom → T (≤ 26 kolom)

export class GoogleError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function g<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GoogleError(res.status, body.slice(0, 300));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export interface SheetRef {
  id: string;
  url: string;
  tab: string;
}

async function firstTab(token: string, id: string) {
  const meta = await g<{ sheets: { properties: { sheetId: number; title: string } }[] }>(
    token, `${SHEETS}/${id}?fields=sheets.properties(sheetId,title)`,
  );
  const tabs = meta.sheets.map((s) => s.properties);
  return tabs.find((t) => t.title === SHEET_TITLE) ?? tabs[0];
}

async function create(token: string): Promise<SheetRef> {
  const file = await g<{ id: string; webViewLink: string }>(token, `${DRIVE}?fields=id,webViewLink`, {
    method: "POST",
    body: JSON.stringify({
      name: "Lokerku",
      mimeType: "application/vnd.google-apps.spreadsheet",
      description: "Data loker dari Lokerku. Baris pertama adalah header, jangan diubah urutannya.",
      appProperties: { [APP_PROP.key]: APP_PROP.value },
    }),
  });
  const tab = await firstTab(token, file.id);
  await g(token, `${SHEETS}/${file.id}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: tab.sheetId, title: SHEET_TITLE, gridProperties: { frozenRowCount: 1 } },
            fields: "title,gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: { sheetId: tab.sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
      ],
    }),
  });
  await writeRows(token, { id: file.id, url: file.webViewLink, tab: SHEET_TITLE }, [], 0);
  return { id: file.id, url: file.webViewLink, tab: SHEET_TITLE };
}

/**
 * Temukan spreadsheet Lokerku milik pengguna. Dengan scope drive.file, Drive hanya menampilkan
 * file yang dibuat aplikasi ini, jadi pencarian ini tidak pernah melihat file lain di Drive mereka.
 */
export async function ensureSheet(token: string, hintId?: string | null): Promise<SheetRef> {
  if (hintId) {
    try {
      const f = await g<{ id: string; webViewLink: string; trashed: boolean }>(
        token, `${DRIVE}/${hintId}?fields=id,webViewLink,trashed`,
      );
      if (!f.trashed) return { id: f.id, url: f.webViewLink, tab: (await firstTab(token, f.id)).title };
    } catch (e) {
      if (!(e instanceof GoogleError) || e.status !== 404) throw e;
    }
  }
  const q = `appProperties has { key='${APP_PROP.key}' and value='${APP_PROP.value}' } and trashed=false`;
  const list = await g<{ files: { id: string; webViewLink: string }[] }>(
    token, `${DRIVE}?q=${encodeURIComponent(q)}&orderBy=createdTime&pageSize=1&fields=files(id,webViewLink)`,
  );
  const found = list.files[0];
  if (found) return { id: found.id, url: found.webViewLink, tab: (await firstTab(token, found.id)).title };
  return create(token);
}

/**
 * Jalur cepat: satu permintaan baca ke spreadsheet yang ID-nya sudah diketahui, tanpa memeriksa file di Drive
 * dan metadata tab. Mengembalikan null kalau file/tab tidak ditemukan, supaya pemanggil jatuh ke ensureSheet.
 */
export async function readKnownSheet(token: string, id: string): Promise<{ sheet: SheetRef; rows: string[][] } | null> {
  const sheet: SheetRef = { id, url: `https://docs.google.com/spreadsheets/d/${id}/edit`, tab: SHEET_TITLE };
  try {
    return { sheet, rows: await readRows(token, sheet) };
  } catch (e) {
    if (e instanceof GoogleError && (e.status === 400 || e.status === 404)) return null;
    throw e;
  }
}

const range = (tab: string, a1: string) => encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${a1}`);

export async function readRows(token: string, sheet: SheetRef): Promise<string[][]> {
  const r = await g<{ values?: string[][] }>(
    token, `${SHEETS}/${sheet.id}/values/${range(sheet.tab, `A1:${LAST_COL}`)}?valueRenderOption=FORMATTED_VALUE`,
  );
  return r.values ?? [];
}

/** Tulis ulang seluruh tabel (header + baris), lalu kosongkan sisa baris lama di bawahnya. */
export async function writeRows(token: string, sheet: SheetRef, rows: string[][], previousCount: number) {
  // RAW: teks disimpan apa adanya, jadi isi sel tidak pernah dieksekusi sebagai formula.
  await g(token, `${SHEETS}/${sheet.id}/values/${range(sheet.tab, "A1")}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [[...HEADER], ...rows] }),
  });
  const total = rows.length + 1;
  if (previousCount > total) {
    await g(token, `${SHEETS}/${sheet.id}/values/${range(sheet.tab, `A${total + 1}:${LAST_COL}${previousCount}`)}:clear`, {
      method: "POST",
      body: "{}",
    });
  }
}
