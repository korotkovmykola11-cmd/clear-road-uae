/**
 * Если в input/index.html снова положили «полный» монолит (весь CSS внутри <style>),
 * вытащить первый большой блок стилей в src/styles/app.css и вернуть плейсхолдер.
 * Запуск: node scripts/extract-css.mjs
 * Уже режим плейсхолдера — скрипт ничего не меняет.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const inputFile = join(projectRoot, "input", "index.html");
const cssFile = join(projectRoot, "src", "styles", "app.css");
const PLACEHOLDER = "__CLEAR_ROAD_BUILD_CSS_PLACEHOLDER__";

const placeholderBlock = `  <!-- Theme: полный CSS в src/styles/app.css (в dist встраивается командой npm run build) -->
  <style id="clear-road-inline-theme">
__CLEAR_ROAD_BUILD_CSS_PLACEHOLDER__
  </style>`;

function main() {
  if (!existsSync(inputFile)) {
    console.error("Нет", inputFile);
    process.exit(1);
  }
  let html = readFileSync(inputFile, "utf8");
  if (html.includes(PLACEHOLDER)) {
    console.log("Уже плейсхолдер — extract-css не нужен.");
    return;
  }
  const re = /<style[^>]*>\s*([\s\S]*?)\s*<\/style>\s*[\r\n]*<\/head>/i;
  const m = html.match(re);
  if (!m) {
    console.error("Не найден <style>…</style> перед </head>");
    process.exit(1);
  }
  const css = m[1].trim();
  if (css.length < 500) {
    console.error("Подозрительно короткий CSS:", css.length);
    process.exit(1);
  }
  writeFileSync(cssFile, css + "\n", "utf8");
  const newHtml = html.replace(re, `${placeholderBlock}\n\n</head>`);
  writeFileSync(inputFile, newHtml, "utf8");
  console.log("OK: CSS →", cssFile, "(" + css.length + " chars)");
  console.log("OK: input обновлён с плейсхолдером");
}

main();
