import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SEED } from "../lib/seed";

/**
 * Audit aksesibilitas otomatis (axe-core, WCAG 2.2 A/AA) untuk setiap layar dan keadaan penting,
 * di tema terang dan gelap. Gagal bila ada pelanggaran berdampak "serious" atau "critical".
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const report = bad.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n  ")}`);
  expect(report, `${label}\n${report.join("\n")}`).toEqual([]);
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((t) => localStorage.setItem("lokerku.theme", t), theme);
}

async function restoreSeed(page: Page) {
  await page.getByRole("button", { name: "Menu lainnya" }).click();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("menuitem", { name: "Restore dari backup…" }).click()]);
  await chooser.setFiles({
    name: "lokerku-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ app: "lokerku", version: 1, jobs: SEED })),
  });
  await expect(page.getByText(/loker dipulihkan/)).toBeVisible();
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`aksesibilitas (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await setTheme(page, theme);
    });

    test("beranda dan privasi", async ({ page }) => {
      await page.goto("/");
      await audit(page, "beranda");
      await page.goto("/privasi");
      await audit(page, "privasi");
    });

    test("tabel: kosong, berisi, menu, pengaturan", async ({ page }) => {
      await page.goto("/app");
      await page.evaluate(() => new Promise<void>((r) => { const q = indexedDB.deleteDatabase("lokerku-guest"); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
      await page.reload();
      await expect(page.getByText("Belum ada loker tersimpan")).toBeVisible();
      await audit(page, "tabel kosong");

      await restoreSeed(page);
      await audit(page, "tabel berisi");

      await page.getByRole("button", { name: "Menu lainnya" }).click();
      await expect(page.getByRole("menu")).toBeVisible();
      await audit(page, "menu ⋯");

      await page.getByRole("menuitem", { name: "Pengaturan" }).click();
      await expect(page.getByRole("dialog", { name: "Pengaturan" })).toBeVisible();
      await audit(page, "pengaturan");
    });

    test("dialog tambah loker: langkah link dan review", async ({ page }) => {
      await page.goto("/app");
      await page.getByRole("button", { name: /^Tambah( loker)?$/ }).click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("#lk-url").fill("https://www.instagram.com/p/abc/");
      await expect(dialog.getByText("Instagram terdeteksi")).toBeVisible();
      await audit(page, "langkah 1");

      await page.route("**/api/extract", (route) =>
        route.fulfill({ json: { confidence: "failed", missing: ["company", "title", "city", "salary", "postedAt", "deadline"], note: "login-required", data: { url: "https://www.instagram.com/p/abc/", platform: "Instagram" } } }),
      );
      await dialog.getByRole("button", { name: "Ambil data" }).click();
      await expect(dialog.getByText("Postingan ini hanya terbuka setelah login")).toBeVisible();
      await audit(page, "langkah 3 (gagal, kotak tempel terbuka)");
    });
  });
}
