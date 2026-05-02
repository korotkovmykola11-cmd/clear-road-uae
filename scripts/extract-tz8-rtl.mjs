/**
 * Полный блок <script id="tz8-rtl-script"> → src/js/tz8-rtl-layer.js и плейсхолдер.
 * Запуск: node scripts/extract-tz8-rtl.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const inputFile = join(projectRoot, "input", "index.html");
const jsDir = join(projectRoot, "src", "js");
const jsFile = join(jsDir, "tz8-rtl-layer.js");
const PLACEHOLDER = "__CLEAR_ROAD_BUILD_JS_TZ8_RTL__";
const replacementBlock = `<script id="tz8-rtl-script">
${PLACEHOLDER}
</script>`;

function main() {
  if (!existsSync(inputFile)) {
    console.error("Нет", inputFile);
    process.exit(1);
  }
  let html = readFileSync(inputFile, "utf8");
  if (html.includes(PLACEHOLDER)) {
    console.log("Уже плейсхолдер — extract-tz8-rtl не нужен.");
    return;
  }
  const re =
    /<script\s+id=["']tz8-rtl-script["'][^>]*>\s*([\s\S]*?)\s*<\/script>/i;
  const m = html.match(re);
  if (!m) {
    console.error("Не найден <script id=\"tz8-rtl-script\">…</script>");
    process.exit(1);
  }
  const body = m[1].trim();
  if (!body.includes("clearRoadTZ8RTL")) {
    console.error("Внутри скрипта нет clearRoadTZ8RTL");
    process.exit(1);
  }
  mkdirSync(jsDir, { recursive: true });
  writeFileSync(jsFile, body + "\n", "utf8");
  writeFileSync(inputFile, html.replace(re, replacementBlock), "utf8");
  console.log("OK →", jsFile);
}

main();
