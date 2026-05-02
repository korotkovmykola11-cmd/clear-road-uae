/**
 * Если в input/index.html снова положили полный IIFE внутри
 * <script id="cr-fix-route-empty-state-final-v2">…</script>,
 * вытащить его в src/js/cr-route-empty-state-final-v2.js и вернуть плейсхолдер.
 * Запуск: node scripts/extract-empty-state-js.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const inputFile = join(projectRoot, "input", "index.html");
const jsDir = join(projectRoot, "src", "js");
const jsFile = join(jsDir, "cr-route-empty-state-final-v2.js");
const PLACEHOLDER = "__CLEAR_ROAD_BUILD_JS_EMPTY_STATE_V2__";

const replacementBlock = `<script id="cr-fix-route-empty-state-final-v2">
${PLACEHOLDER}
</script>`;

function main() {
  if (!existsSync(inputFile)) {
    console.error("Нет", inputFile);
    process.exit(1);
  }
  let html = readFileSync(inputFile, "utf8");
  if (html.includes(PLACEHOLDER)) {
    console.log("Уже плейсхолдер — extract-empty-state-js не нужен.");
    return;
  }
  const re =
    /<script\s+id=["']cr-fix-route-empty-state-final-v2["'][^>]*>\s*([\s\S]*?)\s*<\/script>/i;
  const m = html.match(re);
  if (!m) {
    console.error("Не найден <script id=\"cr-fix-route-empty-state-final-v2\">…</script>");
    process.exit(1);
  }
  const body = m[1].trim();
  if (!body.includes("crFixRouteEmptyStateFinalV2")) {
    console.error("Внутри скрипта нет crFixRouteEmptyStateFinalV2");
    process.exit(1);
  }
  mkdirSync(jsDir, { recursive: true });
  writeFileSync(jsFile, body + "\n", "utf8");
  const newHtml = html.replace(re, replacementBlock);
  writeFileSync(inputFile, newHtml, "utf8");
  console.log("OK →", jsFile);
  console.log("OK: input обновлён с плейсхолдером");
}

main();
