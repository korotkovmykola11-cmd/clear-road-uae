/**
 * Сборка артефакта для деплоя: один dist/index.html (вариант A).
 * CSS: src/styles/app.css → __CLEAR_ROAD_BUILD_CSS_PLACEHOLDER__
 * i18n: src/i18n/app-i18n.js → __CLEAR_ROAD_BUILD_I18N_PLACEHOLDER__
 * cr-empty-state: src/js/cr-route-empty-state-final-v2.js → __CLEAR_ROAD_BUILD_JS_EMPTY_STATE_V2__
 * tz8-rtl: src/js/tz8-rtl-layer.js → __CLEAR_ROAD_BUILD_JS_TZ8_RTL__
 * ux-self-check: src/js/cr-ux-self-check.js → __CLEAR_ROAD_BUILD_JS_UX_SELF_CHECK__
 * tz9-voice: src/js/tz9-voice-layer.js → __CLEAR_ROAD_BUILD_JS_TZ9_VOICE__
 * ux-diag-bootstrap: src/js/cr-ux-diag-bootstrap.js → __CLEAR_ROAD_BUILD_JS_UX_DIAG_BOOTSTRAP__ (внутри основного script, до GLOBAL STATE)
 * tz1-tz2-final-patch: src/js/cr-tz1-tz2-final-patch.js → __CLEAR_ROAD_BUILD_JS_TZ1_TZ2_FINAL__
 * tz3-i18n-clean: src/js/cr-tz3-i18n-clean-layer.js → __CLEAR_ROAD_BUILD_JS_TZ3_I18N_CLEAN__
 * tz4-mobile: src/js/cr-tz4-mobile-layout-guard.js → __CLEAR_ROAD_BUILD_JS_TZ4_MOBILE__
 * tz6-ai-clean: src/js/cr-tz6-ai-decision-clean.js → __CLEAR_ROAD_BUILD_JS_TZ6_AI_CLEAN__
 * tz6b-final: src/js/cr-tz6b-final-fix.js → __CLEAR_ROAD_BUILD_JS_TZ6B_FINAL__
 * tz7+tz8: src/js/cr-tz7-tz8-ai-bundle.js → __CLEAR_ROAD_BUILD_JS_TZ7_TZ8_BUNDLE__
 * Maps key: CLEAR_ROAD_MAPS_API_KEY или GOOGLE_MAPS_API_KEY, иначе src/secrets/maps-api-key.txt (первая строка), иначе встроенный dev-ключ + предупреждение. Флаг --require-maps-key — без env/файла сборка падает (прод).
 * Вход: input/index.html; иначе ../index.html; иначе CLEAR_ROAD_INPUT=...
 * После записи dist: копия в ../index.html (родитель clear-road-uae), чтобы в Загрузках рядом с desktop.ini был актуальный файл. Отключить: --no-copy-parent
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const distDir = join(projectRoot, "dist");
const distFile = join(distDir, "index.html");
/** Рядом с desktop.ini в типичной схеме: Downloads\index.html */
const parentIndexHtml = resolve(projectRoot, "..", "index.html");
const cssFile = join(projectRoot, "src", "styles", "app.css");
const i18nFile = join(projectRoot, "src", "i18n", "app-i18n.js");
const emptyStateJsFile = join(projectRoot, "src", "js", "cr-route-empty-state-final-v2.js");
const tz8RtlJsFile = join(projectRoot, "src", "js", "tz8-rtl-layer.js");
const uxSelfCheckJsFile = join(projectRoot, "src", "js", "cr-ux-self-check.js");
const tz9VoiceJsFile = join(projectRoot, "src", "js", "tz9-voice-layer.js");
const uxDiagBootstrapJsFile = join(projectRoot, "src", "js", "cr-ux-diag-bootstrap.js");
const tz1Tz2FinalPatchJsFile = join(projectRoot, "src", "js", "cr-tz1-tz2-final-patch.js");
const tz3I18nCleanJsFile = join(projectRoot, "src", "js", "cr-tz3-i18n-clean-layer.js");
const tz4MobileJsFile = join(projectRoot, "src", "js", "cr-tz4-mobile-layout-guard.js");
const tz6AiCleanJsFile = join(projectRoot, "src", "js", "cr-tz6-ai-decision-clean.js");
const tz6bFinalJsFile = join(projectRoot, "src", "js", "cr-tz6b-final-fix.js");
const tz7Tz8BundleJsFile = join(projectRoot, "src", "js", "cr-tz7-tz8-ai-bundle.js");
const mapsKeySecretFile = join(projectRoot, "src", "secrets", "maps-api-key.txt");
/** Только для локальной сборки без env/secrets; для прод задайте CLEAR_ROAD_MAPS_API_KEY */
const MAPS_KEY_DEV_FALLBACK = "AIzaSyDLG6edII5ZKCffP_4qnwiNWg2X9IaLMM4";
const PLACEHOLDER_CSS = "__CLEAR_ROAD_BUILD_CSS_PLACEHOLDER__";
const PLACEHOLDER_I18N = "__CLEAR_ROAD_BUILD_I18N_PLACEHOLDER__";
const PLACEHOLDER_EMPTY_STATE_JS = "__CLEAR_ROAD_BUILD_JS_EMPTY_STATE_V2__";
const PLACEHOLDER_TZ8_RTL_JS = "__CLEAR_ROAD_BUILD_JS_TZ8_RTL__";
const PLACEHOLDER_UX_SELF_CHECK_JS = "__CLEAR_ROAD_BUILD_JS_UX_SELF_CHECK__";
const PLACEHOLDER_TZ9_VOICE_JS = "__CLEAR_ROAD_BUILD_JS_TZ9_VOICE__";
const PLACEHOLDER_UX_DIAG_BOOTSTRAP_JS = "__CLEAR_ROAD_BUILD_JS_UX_DIAG_BOOTSTRAP__";
const PLACEHOLDER_TZ1_TZ2_FINAL_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_TZ2_FINAL__";
const PLACEHOLDER_TZ3_I18N_CLEAN_JS = "__CLEAR_ROAD_BUILD_JS_TZ3_I18N_CLEAN__";
const PLACEHOLDER_TZ4_MOBILE_JS = "__CLEAR_ROAD_BUILD_JS_TZ4_MOBILE__";
const PLACEHOLDER_TZ6_AI_CLEAN_JS = "__CLEAR_ROAD_BUILD_JS_TZ6_AI_CLEAN__";
const PLACEHOLDER_TZ6B_FINAL_JS = "__CLEAR_ROAD_BUILD_JS_TZ6B_FINAL__";
const PLACEHOLDER_TZ7_TZ8_BUNDLE_JS = "__CLEAR_ROAD_BUILD_JS_TZ7_TZ8_BUNDLE__";
const PLACEHOLDER_MAPS_KEY = "__CLEAR_ROAD_BUILD_MAPS_API_KEY__";

const args = process.argv.slice(2);
const verifyOnly = args.includes("--verify-only");
const noBanner = args.includes("--no-banner");
const noCopyParent = args.includes("--no-copy-parent");
const requireMapsKey = args.includes("--require-maps-key");

function resolveInputPath() {
  const envPath = process.env.CLEAR_ROAD_INPUT && String(process.env.CLEAR_ROAD_INPUT).trim();
  if (envPath && existsSync(envPath)) return resolve(envPath);

  const localInput = join(projectRoot, "input", "index.html");
  if (existsSync(localInput)) return localInput;

  const siblingDownloads = resolve(projectRoot, "..", "index.html");
  if (existsSync(siblingDownloads)) return siblingDownloads;

  console.error("Не найден входной HTML. Варианты:");
  console.error("  1) Положите файл в", localInput);
  console.error("  2) Или CLEAR_ROAD_INPUT=абсолютный_путь_к_index.html");
  console.error("  3) Или держите index.html в родителе папки clear-road-uae (например Downloads\\index.html)");
  process.exit(1);
}

function injectCss(html) {
  if (!html.includes(PLACEHOLDER_CSS)) return html;
  if (!existsSync(cssFile)) {
    console.error("В HTML есть плейсхолдер CSS, но нет файла:", cssFile);
    process.exit(1);
  }
  const css = readFileSync(cssFile, "utf8");
  if (!css.trim()) {
    console.error("Пустой CSS:", cssFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_CSS).join(css);
}

function injectI18n(html) {
  if (!html.includes(PLACEHOLDER_I18N)) return html;
  if (!existsSync(i18nFile)) {
    console.error("В HTML есть плейсхолдер i18n, но нет файла:", i18nFile);
    process.exit(1);
  }
  const js = readFileSync(i18nFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой i18n:", i18nFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_I18N).join(js);
}

function injectEmptyStateJs(html) {
  if (!html.includes(PLACEHOLDER_EMPTY_STATE_JS)) return html;
  if (!existsSync(emptyStateJsFile)) {
    console.error("В HTML есть плейсхолдер empty-state JS, но нет файла:", emptyStateJsFile);
    process.exit(1);
  }
  const js = readFileSync(emptyStateJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой empty-state:", emptyStateJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_EMPTY_STATE_JS).join(js);
}

function injectTz8RtlJs(html) {
  if (!html.includes(PLACEHOLDER_TZ8_RTL_JS)) return html;
  if (!existsSync(tz8RtlJsFile)) {
    console.error("В HTML есть плейсхолдер TZ8 RTL, но нет файла:", tz8RtlJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz8RtlJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ8 RTL:", tz8RtlJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ8_RTL_JS).join(js);
}

function injectUxSelfCheckJs(html) {
  if (!html.includes(PLACEHOLDER_UX_SELF_CHECK_JS)) return html;
  if (!existsSync(uxSelfCheckJsFile)) {
    console.error("В HTML есть плейсхолдер UX self-check, но нет файла:", uxSelfCheckJsFile);
    process.exit(1);
  }
  const js = readFileSync(uxSelfCheckJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой UX self-check:", uxSelfCheckJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_UX_SELF_CHECK_JS).join(js);
}

function injectTz9VoiceJs(html) {
  if (!html.includes(PLACEHOLDER_TZ9_VOICE_JS)) return html;
  if (!existsSync(tz9VoiceJsFile)) {
    console.error("В HTML есть плейсхолдер TZ9 voice, но нет файла:", tz9VoiceJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz9VoiceJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ9 voice:", tz9VoiceJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ9_VOICE_JS).join(js);
}

function injectUxDiagBootstrapJs(html) {
  if (!html.includes(PLACEHOLDER_UX_DIAG_BOOTSTRAP_JS)) return html;
  if (!existsSync(uxDiagBootstrapJsFile)) {
    console.error("В HTML есть плейсхолдер UX diag bootstrap, но нет файла:", uxDiagBootstrapJsFile);
    process.exit(1);
  }
  const js = readFileSync(uxDiagBootstrapJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой UX diag bootstrap:", uxDiagBootstrapJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_UX_DIAG_BOOTSTRAP_JS).join(js);
}

function injectTz1Tz2FinalJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_TZ2_FINAL_JS)) return html;
  if (!existsSync(tz1Tz2FinalPatchJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1+TZ2 final patch, но нет файла:", tz1Tz2FinalPatchJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1Tz2FinalPatchJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1+TZ2 final patch:", tz1Tz2FinalPatchJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_TZ2_FINAL_JS).join(js);
}

function injectTz3I18nCleanJs(html) {
  if (!html.includes(PLACEHOLDER_TZ3_I18N_CLEAN_JS)) return html;
  if (!existsSync(tz3I18nCleanJsFile)) {
    console.error("В HTML есть плейсхолдер TZ3 i18n clean, но нет файла:", tz3I18nCleanJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz3I18nCleanJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ3 i18n clean:", tz3I18nCleanJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ3_I18N_CLEAN_JS).join(js);
}

function injectTz4MobileJs(html) {
  if (!html.includes(PLACEHOLDER_TZ4_MOBILE_JS)) return html;
  if (!existsSync(tz4MobileJsFile)) {
    console.error("В HTML есть плейсхолдер TZ4 mobile, но нет файла:", tz4MobileJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz4MobileJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ4 mobile:", tz4MobileJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ4_MOBILE_JS).join(js);
}

function injectTz6AiCleanJs(html) {
  if (!html.includes(PLACEHOLDER_TZ6_AI_CLEAN_JS)) return html;
  if (!existsSync(tz6AiCleanJsFile)) {
    console.error("В HTML есть плейсхолдер TZ6 AI clean, но нет файла:", tz6AiCleanJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz6AiCleanJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ6 AI clean:", tz6AiCleanJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ6_AI_CLEAN_JS).join(js);
}

function injectTz6bFinalJs(html) {
  if (!html.includes(PLACEHOLDER_TZ6B_FINAL_JS)) return html;
  if (!existsSync(tz6bFinalJsFile)) {
    console.error("В HTML есть плейсхолдер TZ6B final, но нет файла:", tz6bFinalJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz6bFinalJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ6B final:", tz6bFinalJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ6B_FINAL_JS).join(js);
}

function injectTz7Tz8BundleJs(html) {
  if (!html.includes(PLACEHOLDER_TZ7_TZ8_BUNDLE_JS)) return html;
  if (!existsSync(tz7Tz8BundleJsFile)) {
    console.error("В HTML есть плейсхолдер TZ7+TZ8 bundle, но нет файла:", tz7Tz8BundleJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz7Tz8BundleJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ7+TZ8 bundle:", tz7Tz8BundleJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ7_TZ8_BUNDLE_JS).join(js);
}

function resolveMapsApiKey() {
  const env =
    (process.env.CLEAR_ROAD_MAPS_API_KEY && String(process.env.CLEAR_ROAD_MAPS_API_KEY).trim()) ||
    (process.env.GOOGLE_MAPS_API_KEY && String(process.env.GOOGLE_MAPS_API_KEY).trim()) ||
    "";
  if (env) return { key: env, source: "env" };
  if (existsSync(mapsKeySecretFile)) {
    const line = readFileSync(mapsKeySecretFile, "utf8").trim().split(/\r?\n/)[0]?.trim() || "";
    if (line) return { key: line, source: "src/secrets/maps-api-key.txt" };
  }
  if (requireMapsKey) {
    console.error(
      "Сборка с --require-maps-key: задайте CLEAR_ROAD_MAPS_API_KEY или GOOGLE_MAPS_API_KEY, либо первую строку в src/secrets/maps-api-key.txt"
    );
    process.exit(1);
  }
  console.warn(
    "Внимание: CLEAR_ROAD_MAPS_API_KEY не задан и нет src/secrets/maps-api-key.txt — подставлен встроенный dev-ключ. Для продакшена задайте переменную или файл."
  );
  return { key: MAPS_KEY_DEV_FALLBACK, source: "dev-fallback" };
}

function injectMapsApiKey(html, key) {
  if (!html.includes(PLACEHOLDER_MAPS_KEY)) return html;
  const k = String(key || "").trim();
  if (!k.startsWith("AIza") || k.length < 30) {
    console.error("Некорректный Google Maps API key (ожидается строка, начинающаяся с AIza…).");
    process.exit(1);
  }
  return html.split(PLACEHOLDER_MAPS_KEY).join(k);
}

function validateArtifact(html) {
  if (html.includes(PLACEHOLDER_CSS)) {
    console.error("В артефакте остался плейсхолдер CSS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_I18N)) {
    console.error("В артефакте остался плейсхолдер i18n — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_EMPTY_STATE_JS)) {
    console.error("В артефакте остался плейсхолдер empty-state JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ8_RTL_JS)) {
    console.error("В артефакте остался плейсхолдер TZ8 RTL JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_UX_SELF_CHECK_JS)) {
    console.error("В артефакте остался плейсхолдер UX self-check JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ9_VOICE_JS)) {
    console.error("В артефакте остался плейсхолдер TZ9 voice JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_UX_DIAG_BOOTSTRAP_JS)) {
    console.error("В артефакте остался плейсхолдер UX diag bootstrap JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_TZ2_FINAL_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1+TZ2 final JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ3_I18N_CLEAN_JS)) {
    console.error("В артефакте остался плейсхолдер TZ3 i18n clean JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ4_MOBILE_JS)) {
    console.error("В артефакте остался плейсхолдер TZ4 mobile JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ6_AI_CLEAN_JS)) {
    console.error("В артефакте остался плейсхолдер TZ6 AI clean JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ6B_FINAL_JS)) {
    console.error("В артефакте остался плейсхолдер TZ6B final JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ7_TZ8_BUNDLE_JS)) {
    console.error("В артефакте остался плейсхолдер TZ7+TZ8 bundle JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_MAPS_KEY)) {
    console.error("В артефакте остался плейсхолдер Maps API key — сборка не завершена.");
    process.exit(1);
  }
  const checks = [
    ["DOCTYPE", /<!DOCTYPE\s+html/i.test(html)],
    ["__CLEAR_ROAD_ROUTE_CANON__", html.includes("__CLEAR_ROAD_ROUTE_CANON__")],
    ["inline style", /<style[\s>]/i.test(html)],
    ["__CLEAR_ROAD_I18N_DATA__", html.includes("__CLEAR_ROAD_I18N_DATA__")],
    ["maps.googleapis", html.includes("maps.googleapis.com/maps/api/js")],
    ["closing html", /<\/html>\s*$/i.test(html.trim())],
    ["css bulk", html.includes("clear-road.css block") || html.includes(":root {")],
    ["cr-empty-state JS", html.includes("crFixRouteEmptyStateFinalV2")],
    ["tz8 RTL", html.includes("clearRoadTZ8RTL")],
    ["UX self-check", html.includes("__clearRoadRunUxSelfCheck")],
    ["tz9 voice", html.includes("clearRoadTZ9VoiceInput")],
    ["UX diag bootstrap", html.includes("clearRoadUxDiagnosticsBootstrap")],
    ["TZ1+TZ2 final patch", html.includes("crTZ1TZ2FinalPatch")],
    ["TZ3 i18n clean", html.includes("clearRoadTZ3Apply")],
    ["TZ4 mobile guard", html.includes("__TZ4_MOBILE_LAYOUT_CLEANUP__")],
    ["TZ6 AI clean", html.includes("clearRoadTZ6AIDecisionClean")],
    ["TZ6B final", html.includes("clearRoadTZ6BFinalFix")],
    ["TZ7+TZ8 bundle", html.includes("applyTZ8RealAIDecisionEngine")]
  ];
  const bad = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (bad.length) {
    console.error("Проверка артефакта не пройдена, нет:", bad.join(", "));
    process.exit(1);
  }
}

function validateSourceInput(html) {
  if (html.includes(PLACEHOLDER_CSS)) {
    if (!existsSync(cssFile) || !readFileSync(cssFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер CSS — нужен непустой", cssFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_I18N)) {
    if (!existsSync(i18nFile) || !readFileSync(i18nFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер i18n — нужен непустой", i18nFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_EMPTY_STATE_JS)) {
    if (!existsSync(emptyStateJsFile) || !readFileSync(emptyStateJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер empty-state JS — нужен непустой", emptyStateJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ8_RTL_JS)) {
    if (!existsSync(tz8RtlJsFile) || !readFileSync(tz8RtlJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ8 RTL — нужен непустой", tz8RtlJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_UX_SELF_CHECK_JS)) {
    if (!existsSync(uxSelfCheckJsFile) || !readFileSync(uxSelfCheckJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер UX self-check — нужен непустой", uxSelfCheckJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ9_VOICE_JS)) {
    if (!existsSync(tz9VoiceJsFile) || !readFileSync(tz9VoiceJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ9 voice — нужен непустой", tz9VoiceJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_UX_DIAG_BOOTSTRAP_JS)) {
    if (!existsSync(uxDiagBootstrapJsFile) || !readFileSync(uxDiagBootstrapJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер UX diag bootstrap — нужен непустой", uxDiagBootstrapJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_TZ2_FINAL_JS)) {
    if (!existsSync(tz1Tz2FinalPatchJsFile) || !readFileSync(tz1Tz2FinalPatchJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1+TZ2 final — нужен непустой", tz1Tz2FinalPatchJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ3_I18N_CLEAN_JS)) {
    if (!existsSync(tz3I18nCleanJsFile) || !readFileSync(tz3I18nCleanJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ3 i18n clean — нужен непустой", tz3I18nCleanJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ4_MOBILE_JS)) {
    if (!existsSync(tz4MobileJsFile) || !readFileSync(tz4MobileJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ4 mobile — нужен непустой", tz4MobileJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ6_AI_CLEAN_JS)) {
    if (!existsSync(tz6AiCleanJsFile) || !readFileSync(tz6AiCleanJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ6 AI clean — нужен непустой", tz6AiCleanJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ6B_FINAL_JS)) {
    if (!existsSync(tz6bFinalJsFile) || !readFileSync(tz6bFinalJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ6B final — нужен непустой", tz6bFinalJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ7_TZ8_BUNDLE_JS)) {
    if (!existsSync(tz7Tz8BundleJsFile) || !readFileSync(tz7Tz8BundleJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ7+TZ8 bundle — нужен непустой", tz7Tz8BundleJsFile);
      process.exit(1);
    }
  }
}

function main() {
  const inputPath = resolveInputPath();
  let html = readFileSync(inputPath, "utf8");
  validateSourceInput(html);

  const mapsKeyInfo = resolveMapsApiKey();
  let out = injectMapsApiKey(
    injectUxSelfCheckJs(
      injectTz9VoiceJs(
        injectEmptyStateJs(
          injectTz8RtlJs(
            injectTz7Tz8BundleJs(
              injectTz6bFinalJs(
                injectTz6AiCleanJs(
                  injectTz4MobileJs(
                    injectTz3I18nCleanJs(
                      injectTz1Tz2FinalJs(injectUxDiagBootstrapJs(injectI18n(injectCss(html))))
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),
    mapsKeyInfo.key
  );
  validateArtifact(out);

  if (verifyOnly) {
    console.log(
      "verify-only: OK",
      inputPath,
      "→ injected, bytes:",
      Buffer.byteLength(out, "utf8"),
      "maps key:",
      mapsKeyInfo.source
    );
    return;
  }

  mkdirSync(distDir, { recursive: true });

  if (!noBanner) {
    const stamp = new Date().toISOString();
    const hash = createHash("sha256").update(out).digest("hex").slice(0, 16);
    const banner = `<!-- clear-road-uae build ${stamp} sha256:${hash} source:${inputPath.replace(/\\/g, "/")} -->\n`;
    out = out.replace(/^(<!DOCTYPE[^>]*>\s*)/i, (_, d) => `${d}${banner}`);
  }

  writeFileSync(distFile, out, "utf8");
  const bytes = Buffer.byteLength(out, "utf8");
  console.log("OK →", distFile);
  if (!noCopyParent) {
    copyFileSync(distFile, parentIndexHtml);
    console.log("OK →", parentIndexHtml, "(копия для папки над проектом)");
  }
  console.log("   HTML:", inputPath);
  console.log("   CSS:", cssFile);
  console.log("   i18n:", i18nFile);
  console.log("   empty-state JS:", emptyStateJsFile);
  console.log("   TZ8 RTL JS:", tz8RtlJsFile);
  console.log("   UX self-check JS:", uxSelfCheckJsFile);
  console.log("   TZ9 voice JS:", tz9VoiceJsFile);
  console.log("   UX diag bootstrap JS:", uxDiagBootstrapJsFile);
  console.log("   TZ1+TZ2 final patch JS:", tz1Tz2FinalPatchJsFile);
  console.log("   TZ3 i18n clean JS:", tz3I18nCleanJsFile);
  console.log("   TZ4 mobile JS:", tz4MobileJsFile);
  console.log("   TZ6 AI clean JS:", tz6AiCleanJsFile);
  console.log("   TZ6B final JS:", tz6bFinalJsFile);
  console.log("   TZ7+TZ8 bundle JS:", tz7Tz8BundleJsFile);
  console.log("   Maps API key:", mapsKeyInfo.source);
  console.log("   размер", bytes, "байт");

  validateArtifact(out);
}

main();
