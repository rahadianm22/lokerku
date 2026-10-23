import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isPrivateIp, fetchHtml, FetchBlocked } = await import("./fetch");

describe("SSRF guard", () => {
  it.each([
    ["127.0.0.1", true], ["10.2.3.4", true], ["172.16.0.1", true], ["172.32.0.1", false],
    ["192.168.1.1", true], ["169.254.169.254", true], ["100.64.0.1", true], ["0.0.0.0", true],
    ["8.8.8.8", false], ["::1", true], ["fd00::1", true], ["fe80::1", true], ["::ffff:127.0.0.1", true],
    ["2606:4700::1111", false],
  ])("%s privat? %s", (ip, out) => expect(isPrivateIp(ip)).toBe(out));

  it.each(["http://localhost/x", "http://127.0.0.1/", "http://[::1]/", "http://printer.local/", "http://a.com:8080/"])(
    "menolak %s sebelum fetch",
    async (url) => {
      await expect(fetchHtml(url, new AbortController().signal)).rejects.toBeInstanceOf(FetchBlocked);
    },
  );
});
