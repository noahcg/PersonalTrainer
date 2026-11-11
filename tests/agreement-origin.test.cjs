/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const path = require("node:path");

// Compile the small, dependency-free helper in memory so this test runs on Node 20.
const source = fs.readFileSync(path.join(__dirname, "../src/lib/agreement/origin.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function("exports", "module", code)(mod.exports, mod);
const { sameOrigin } = mod.exports;
const request = (origin, host = "trainer.example", protocol = "https") => new Request("http://localhost:3100/api/test", { headers: { host, "x-forwarded-proto": protocol, ...(origin ? { origin } : {}) } });

test("accepts a browser origin matching the forwarded public host and scheme", () => {
  assert.equal(sameOrigin(request("https://trainer.example")), true);
  assert.equal(sameOrigin(request("http://127.0.0.1:3100", "127.0.0.1:3100", "http")), true);
});
test("rejects missing, foreign, and mismatched origins", () => {
  assert.equal(sameOrigin(request(null)), false);
  assert.equal(sameOrigin(request("https://other.example")), false);
  assert.equal(sameOrigin(request("http://trainer.example")), false);
  assert.equal(sameOrigin(request("null")), false);
});
