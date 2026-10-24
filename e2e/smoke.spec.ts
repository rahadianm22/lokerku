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

test("pengaturan: simpan otomatis saat link ditempel, bertahan setelah reload", async ({ page }, info) => {
  const mobile = info.project.name === "mobile";
  await page.route("**/api/extract", (route) =>
    route.fulfill({
      json: {
        confidence: "partial",
        missing: ["salary"],
        data: {
          url: "https://glints.com/id/opportunities/jobs/e2e-auto",
          platform: "Glints",
          company: "PT Otomatis",
          title: "Data Analyst Otomatis",
          city: "Bandung",
          deadline: "2026-12-31",
        },
      },
    }),
  );
  await page.goto("/app");

  // Nyalakan di Pengaturan
  await page.getByRole("button", { name: "Menu lainnya" }).click();
  await page.getByRole("menuitem", { name: "Pengaturan" }).click();
  const settings = page.getByRole("dialog", { name: "Pengaturan" });
  const auto = settings.getByRole("switch", { name: /Simpan otomatis/ });
  await expect(auto).toHaveAttribute("aria-checked", "false");
  await auto.click();
  await expect(auto).toHaveAttribute("aria-checked", "true");
  await settings.getByLabel("Status awal").selectOption("applied");
  await settings.getByRole("button", { name: "Selesai" }).click();
  await expect(settings).toBeHidden();

  // Tempel link: langsung tersimpan tanpa langkah review
  await page.getByRole("button", { name: /^Tambah( loker)?$/ }).click();
  const dialog = page.getByRole("dialog");
  const input = dialog.getByLabel("Link lowongan");
  await input.focus();
  await page.evaluate(() => {
    const el = document.getElementById("lk-url")!;
    const dt = new DataTransfer();
    dt.setData("text", "https://glints.com/id/opportunities/jobs/e2e-auto");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Loker disimpan ke tabel")).toBeVisible();
  const row = mobile ? page.getByRole("article", { name: /Data Analyst Otomatis/ }) : page.getByRole("row", { name: /Data Analyst Otomatis/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("Sudah Apply").first()).toBeVisible(); // status awal dari Pengaturan

  // Pengaturan bertahan setelah reload
  await page.reload();
  await page.getByRole("button", { name: "Menu lainnya" }).click();
  await page.getByRole("menuitem", { name: "Pengaturan" }).click();
  await expect(page.getByRole("switch", { name: /Simpan otomatis/ })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("simpan otomatis tidak membuat loker kembar", async ({ page }) => {
  const data = { url: "https://glints.com/id/opportunities/jobs/e2e-dup", platform: "Glints", company: "PT Kembar", title: "Dup Role", city: "Jakarta" };
  await page.route("**/api/extract", (route) => route.fulfill({ json: { confidence: "partial", missing: [], data } }));
  await page.goto("/app");
  await page.getByRole("button", { name: "Menu lainnya" }).click();
  await page.getByRole("menuitem", { name: "Pengaturan" }).click();
  await page.getByRole("switch", { name: /Simpan otomatis/ }).click();
  await page.getByRole("button", { name: "Selesai" }).click();

  const paste = async () => {
    await page.getByRole("button", { name: /^Tambah( loker)?$/ }).click();
    await page.locator("#lk-url").focus();
    await page.evaluate((u) => {
      const el = document.getElementById("lk-url")!;
      const dt = new DataTransfer();
      dt.setData("text", u);
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    }, data.url);
  };
  await paste();
  await expect(page.getByRole("dialog")).toBeHidden();
  await paste();
  // Kedua kali: dialog tetap terbuka dengan banner duplikat.
  await expect(page.getByText("Loker ini sudah ada di tabel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Menampilkan 1 dari 1 loker/)).toBeVisible();
});

test("tombol Beranda kembali ke halaman awal, dan tabel bisa dibuka lagi", async ({ page }, info) => {
  await page.goto("/app");
  if (info.project.name === "mobile") {
    // Di mobile tombolnya pindah ke menu ⋯ supaya header tidak sesak.
    await expect(page.getByRole("link", { name: "Beranda", exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Menu lainnya" }).click();
    await page.getByRole("menuitem", { name: "Ke beranda" }).click();
  } else {
    // Tombol berada di sebelah kiri "Tambah loker".
    const home = page.getByRole("link", { name: "Beranda", exact: true });
    const add = page.getByRole("button", { name: "Tambah loker", exact: true });
    const [h, a] = await Promise.all([home.boundingBox(), add.boundingBox()]);
    expect(h!.x + h!.width).toBeLessThanOrEqual(a!.x);
    await home.click();
  }
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Semua loker yang kamu incar");
  await page.getByRole("link", { name: /Coba tanpa login|Buka Lokerku|Buka tabel loker/ }).first().click();
  await expect(page).toHaveURL(/\/app$/);
});

test("Instagram: dijelaskan butuh login, teks postingan ditempel mengisi kolom tanpa menimpa isian", async ({ page }) => {
  await page.route("**/api/extract", (route) =>
    route.fulfill({
      json: {
        confidence: "failed",
        missing: ["company", "title", "city", "salary", "postedAt", "deadline"],
        note: "login-required",
        data: { url: "https://www.instagram.com/p/ABC123/", platform: "Instagram" },
      },
    }),
  );
  await page.goto("/app");
  await page.getByRole("button", { name: /^Tambah( loker)?$/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#lk-url").fill("https://www.instagram.com/p/ABC123/");
  await dialog.getByRole("button", { name: "Ambil data" }).click();

  await expect(dialog.getByText("Postingan ini hanya terbuka setelah login")).toBeVisible();
  // Judul generik "Instagram" tidak boleh jadi nama posisi.
  await expect(dialog.getByLabel("Posisi")).toHaveValue("");

  await dialog.getByLabel("Perusahaan").fill("Isian Saya"); // tidak boleh tertimpa
  await dialog.getByLabel("Teks lowongan").fill("UI/UX DESIGNER, WE NEED YOU!\nStudio Contoh lagi cari partner.\nPositions Available: UI/UX Designer\nLokasi: Bandung");
  await dialog.getByRole("button", { name: "Isi dari teks" }).click();

  await expect(dialog.getByText(/Terisi: Posisi, Lokasi/)).toBeVisible();
  await expect(dialog.getByLabel("Posisi")).toHaveValue("UI/UX Designer");
  await expect(dialog.getByLabel("Lokasi")).toHaveValue("Bandung");
  await expect(dialog.getByLabel("Perusahaan")).toHaveValue("Isian Saya");
  await dialog.getByRole("button", { name: "Simpan ke tabel" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/Menampilkan 1 dari 1 loker/)).toBeVisible();
});
