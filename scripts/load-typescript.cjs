/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// For Node 20 operational scripts and tests; the app uses the normal Next compiler.
function createTypeScriptLoader(overrides = {}) {
  const cache = new Map();
  function loadTypeScript(file) {
    const resolved = path.resolve(file);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const moduleValue = { exports: {} };
    cache.set(resolved, moduleValue);
    const code = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const localRequire = (name) => {
      if (name in overrides) return overrides[name];
      if (name.startsWith(".") || name.startsWith("@/")) {
        const target = name.startsWith("@/") ? path.join(__dirname, "../src", name.slice(2)) : path.resolve(path.dirname(resolved), name);
        return name.endsWith(".json") ? require(target) : loadTypeScript(`${target}.ts`);
      }
      return require(name);
    };
    new Function("exports", "module", "require", code)(moduleValue.exports, moduleValue, localRequire);
    return moduleValue.exports;
  }
  return loadTypeScript;
}
module.exports = { loadTypeScript: createTypeScriptLoader(), createTypeScriptLoader };
