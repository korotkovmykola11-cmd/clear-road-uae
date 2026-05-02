/**
 * Если в input/index.html снова положили полный словарь внутри <script id="clear-road-inline-i18n">,
 * вытащить его в src/i18n/app-i18n.js и вернуть плейсхолдер.
 * Запуск: node scripts/extract-i18n.mjs
 * Режим плейсхолдера — скрипт ничего не меняет.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const inputFile = join(projectRoot, "input", "index.html");
const i18nDir = join(projectRoot, "src", "i18n");
const i18nFile = join(i18nDir, "app-i18n.js");
const PLACEHOLDER = "__CLEAR_ROAD_BUILD_I18N_PLACEHOLDER__";

const replacementBlock = `<script id="clear-road-inline-i18n">
__CLEAR_ROAD_BUILD_I18N_PLACEHOLDER__
</script>`;

function main() {
  if (!existsSync(inputFile)) {
    console.error("Нет", inputFile);
    process.exit(1);
  }
  let html = readFileSync(inputFile, "utf8");
  if (html.includes(PLACEHOLDER)) {
    console.log("Уже плейсхолдер — extract-i18n не нужен.");
    return;
  }
  const re =
    /<script\s+id=["']clear-road-inline-i18n["'][^>]*>\s*([\s\S]*?)\s*<\/script>/i;
  const m = html.match(re);
  if (!m) {
    console.error(
      'Не найден <script id="clear-road-inline-i18n">…</script> с полным телом'
    );
    process.exit(1);
  }
  const body = m[1].trim();
  if (!body.includes("window.__CLEAR_ROAD_I18N_DATA__")) {
    console.error("Внутри i18n-скрипта нет __CLEAR_ROAD_I18N_DATA__");
    process.exit(1);
  }
  if (body.length < 500) {
    console.error("Подозрительно короткий i18n:", body.length);
    process.exit(1);
  }
  mkdirSync(i18nDir, { recursive: true });
  writeFileSync(i18nFile, body + "\n", "utf8");
  const newHtml = html.replace(re, replacementBlock);
  writeFileSync(inputFile, newHtml, "utf8");
  console.log("OK: i18n →", i18nFile, "(" + body.length + " chars)");
  console.log("OK: input обновлён с плейсхолдером");
}

main();
