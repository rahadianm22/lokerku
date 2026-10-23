import { expect, test } from "@playwright/test";

// Mulai dari database tamu kosong supaya data contoh dev tidak ikut.
test.beforeEach(async ({ page }) => {
  await page.goto("/app");
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("lokerku-guest");
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  });
});

test("tambah loker manual → muncul di tabel → hapus → batalkan", async ({ page }, info) => {
  await page.goto("/app");
  const add = page.getByRole("button", { name: /^Tambah( loker)?$/ });
  await add.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Tempel link lowongan" })).toBeVisible();
  await dialog.getByLabel("Link lowongan").fill("https://karier.contoh-e2e.co.id/lowongan/42");
  await expect(dialog.getByText("Halaman karier perusahaan", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Isi manual saja" }).click();

  await expect(dialog.getByRole("heading", { name: "Cek & rapikan data" })).toBeVisible();
  const save = dialog.getByRole("button", { name: "Simpan ke tabel" });
  await expect(save).toBeDisabled();
  await dialog.getByLabel("Perusahaan").fill("PT Uji Coba");
  await dialog.getByLabel("Posisi").fill("QA Engineer E2E");
  await dialog.getByRole("button", { name: "Tinggi" }).click();
  await save.click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status").getByText("Loker disimpan ke tabel")).toBeVisible();
  const mobile = info.project.name === "mobile";
  const row = mobile
    ? page.getByRole("article", { name: /QA Engineer E2E/ })
    : page.getByRole("row", { name: /QA Engineer E2E/ });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Hapus loker" }).click();
  await expect(row).toBeHidden();
  await expect(page.getByText("Loker dihapus")).toBeVisible();
  await page.getByRole("button", { name: "Batalkan" }).click();
  await expect(row).toBeVisible();

  // Bertahan setelah reload (IndexedDB).
  await page.reload();
  await expect(mobile ? page.getByRole("article", { name: /QA Engineer E2E/ }) : page.getByRole("row", { name: /QA Engineer E2E/ })).toBeVisible();
});

test("hotkey N membuka modal, Esc menutup dan mengembalikan fokus", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "hotkey keyboard hanya relevan di desktop");
  await page.goto("/app");
  const add = page.getByRole("button", { name: "Tambah loker", exact: true });
  await expect(add).toBeVisible();
  // Klik di area netral (wordmark), bukan tengah halaman yang bisa mengenai tombol empty state.
  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(add).toBeFocused();
  await page.keyboard.press("/");
  await expect(page.getByLabel("Cari loker")).toBeFocused();
});
