import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  detectImageMimeFromMagicBytes,
  hashWithServerSalt,
  isSafePostgresConnectionUrl,
} from "./security.ts";
import {
  issueAdminSessionToken,
  verifyAdminCredentials,
  verifyAdminSessionToken,
} from "./admin-auth.ts";

describe("Security Helpers & Admin Auth — XII PPLG 1", () => {
  it("detectImageMimeFromMagicBytes accepts genuine JPEG/PNG/WebP and rejects HTML/SVG", () => {
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const jpgHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const webpHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const htmlSpoof = Buffer.from("<script>alert(1)</script>");
    const svgSpoof = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    assert.equal(detectImageMimeFromMagicBytes(pngHeader), "image/png");
    assert.equal(detectImageMimeFromMagicBytes(jpgHeader), "image/jpeg");
    assert.equal(detectImageMimeFromMagicBytes(webpHeader), "image/webp");
    assert.equal(detectImageMimeFromMagicBytes(htmlSpoof), null);
    assert.equal(detectImageMimeFromMagicBytes(svgSpoof), null);
  });

  it("checkRateLimit allows requests up to limit and blocks limit + 1", () => {
    const key = `test-rl-${Date.now()}-${Math.random()}`;
    const r1 = checkRateLimit(key, 2, 60_000);
    const r2 = checkRateLimit(key, 2, 60_000);
    const r3 = checkRateLimit(key, 2, 60_000);

    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 1);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 0);
    assert.equal(r3.allowed, false);
    assert.ok(r3.retryAfterSec >= 1);
  });

  it("issueAdminSessionToken and verifyAdminSessionToken verify HMAC tokens and reject forged/static ones", () => {
    const valid = issueAdminSessionToken();
    assert.equal(verifyAdminSessionToken(valid), true);

    assert.equal(verifyAdminSessionToken("authenticated_admin_xiipplg1"), false);
    assert.equal(verifyAdminSessionToken(`${valid}tampered`), false);
    assert.equal(verifyAdminSessionToken(""), false);
    assert.equal(verifyAdminSessionToken(null), false);
  });

  it("verifyAdminCredentials performs timing-safe passcode check", () => {
    assert.equal(verifyAdminCredentials("admin@local", "ADMIN-MAKN-ENDE"), true);
    assert.equal(verifyAdminCredentials("admin@local", "wrong-pass"), false);
    assert.equal(verifyAdminCredentials("", ""), false);
  });

  it("hashWithServerSalt produces deterministic 64-char sha256 hex digest", () => {
    const h1 = hashWithServerSalt("127.0.0.1::dev1", "poll-vote");
    const h2 = hashWithServerSalt("127.0.0.1::dev1", "poll-vote");
    const h3 = hashWithServerSalt("127.0.0.1::dev2", "poll-vote");
    assert.equal(h1.length, 64);
    assert.equal(h1, h2);
    assert.notEqual(h1, h3);
  });

  it("isSafePostgresConnectionUrl rejects invalid schemes and metadata hosts", () => {
    assert.equal(
      isSafePostgresConnectionUrl("postgresql://user:pass@db.example.com:5432/postgres").ok,
      true
    );
    assert.equal(
      isSafePostgresConnectionUrl("http://169.254.169.254/latest/meta-data").ok,
      false
    );
    assert.equal(
      isSafePostgresConnectionUrl("postgresql://user:pass@169.254.169.254:5432/db").ok,
      false
    );
  });
});
