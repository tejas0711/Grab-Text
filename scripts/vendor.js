const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const modules = path.join(root, "node_modules");
const target = path.join(root, "vendor", "tesseract");
const coreTarget = path.join(target, "core");

fs.mkdirSync(coreTarget, { recursive: true });
for (const file of fs.readdirSync(coreTarget)) {
  fs.unlinkSync(path.join(coreTarget, file));
}
fs.copyFileSync(
  path.join(modules, "tesseract.js", "dist", "tesseract.min.js"),
  path.join(target, "tesseract.min.js")
);
fs.copyFileSync(
  path.join(modules, "tesseract.js", "dist", "worker.min.js"),
  path.join(target, "worker.min.js")
);
fs.copyFileSync(
  path.join(modules, "tesseract.js", "LICENSE.md"),
  path.join(target, "TESSERACT_JS_LICENSE.md")
);
fs.copyFileSync(
  path.join(modules, "tesseract.js-core", "LICENSE"),
  path.join(target, "TESSERACT_CORE_LICENSE")
);
for (const file of [
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm",
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-lstm.wasm"
]) {
  fs.copyFileSync(path.join(modules, "tesseract.js-core", file), path.join(coreTarget, file));
}
