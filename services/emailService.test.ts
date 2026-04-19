import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { emailService } from "./emailService";

describe("emailService.sendCustomEmail", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to sendAdminEmail Cloud Function with JSON body", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    await emailService.sendCustomEmail(
      [{ email: "a@b.com", name: "A" }],
      "Hello",
      "Body",
      { name: "Admin", email: "admin@b.com" },
      "uid1",
      "org1"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("sendAdminEmail");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      recipients: [{ email: "a@b.com", name: "A" }],
      subject: "Hello",
      body: "Body",
      fromAdmin: { name: "Admin", email: "admin@b.com" },
      adminUserId: "uid1",
      organizationId: "org1",
    });
  });

  it("throws when response is not ok", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "nope" }),
    });
    await expect(
      emailService.sendCustomEmail([{ email: "x@y.com" }], "S", "B")
    ).rejects.toThrow("nope");
  });
});
