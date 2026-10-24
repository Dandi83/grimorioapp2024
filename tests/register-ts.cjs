// Test harnesses load components with their own `require`: this lets it find the TypeScript modules they
// import by relative path ("../lib/display-layout") or with the "@/" alias of the app, transpiled on the fly.
// Loaded by `npm test` (NODE_OPTIONS).
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const resolve = Module._resolveFilename;
const root = path.resolve(__dirname, "..");
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith("@/")) request = path.join(root, request.slice(2));
  try {
    return resolve.call(this, request, parent, ...rest);
  } catch (error) {
    if (request.startsWith(".") || path.isAbsolute(request)) for (const extension of [".ts", ".tsx"]) {
      try { return resolve.call(this, request + extension, parent, ...rest); } catch { /* next */ }
    }
    throw error;
  }
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true },
  }).outputText, filename);
}
