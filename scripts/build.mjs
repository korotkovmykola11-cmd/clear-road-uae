/**
 * Сборка артефакта для деплоя: один dist/index.html (вариант A).
 *
 * --- ТЗ-0. Инварианты (зафиксировано; не менять порядок слоёв без осознанной причины) ---
 * 1) Поток: input/index.html → этот скрипт → dist/index.html (один артефакт).
 * 2) После закрытия основного inline <script> в input порядок внешних слоёв:
 *    cr-tz1-directions-route-extract → cr-tz1-route-metrics-traffic → cr-tz1-route-role-segments → cr-tz1-drive-gps-warnings → cr-tz1-drive-voice-timed-warnings → cr-tz1-drive-lane-timed-hud → cr-tz1-drive-main-instruction → cr-tz1-drive-voice-nav-turns → cr-tz2-normalization-layer → cr-tz1-tz2-decision-helpers → cr-tz1-drive-update-ui → cr-tz3-score-engine → cr-tz4-why-generator → cr-ai-decision-layer → cr-tz1-drive-voice-ai-advice → cr-route-cards-ui-cleanup → cr-render-results-decision-ui → cr-route-compare-modal-ui → cr-drive-start-nav-entry → cr-tz6-production-safety → cr-tz2-gps-stability → cr-tz7-live-recalculation →
 *    cr-tz3-predictive-stability → cr-tz4-uae-local → cr-tz5-filters → cr-tz6-quick-start →
 *    cr-tz7-main-i18n → tz8-rtl → … (далее по списку плейсхолдеров ниже и по цепочке inject в main()).
 *    TZ6 safety оборачивает функции из main; TZ2 GPS — поверх TZ6; не вставлять между ними посторонние скрипты с тем же глобальным API. Сразу после main: cr-tz1-directions-route-extract (extractRoutesFromDirectionsResult), затем cr-tz1-route-metrics-traffic (calculateRouteMetrics, trafficRank, …), затем cr-tz1-route-role-segments (getRouteRole, buildRouteSegments), затем cr-tz1-drive-gps-warnings (buildDriveViewModel, getWarningPhaseForType, getEffectiveDistanceToStepMeters, …), затем cr-tz1-drive-voice-timed-warnings (buildTimedWarning, normalizeVoiceText, speakDriveInstruction, …), затем cr-tz1-drive-lane-timed-hud (getDriveTimedWarning, getDriveLaneGuidance, …), затем cr-tz1-drive-main-instruction (getCleanDriveMainInstruction, formatDriveMeters, …), затем cr-tz1-drive-voice-nav-turns (speakStartNavigation, maybeSpeakDriveNavigation, …), затем cr-tz2-normalization-layer (normalizeRoute, normalizeRoutes), затем cr-tz1-tz2-decision-helpers (_tz1Minutes, _tz2TollCost, …), затем cr-tz1-drive-update-ui (updateDriveUI, applySmoothedDriveEta, …), затем cr-tz3-score-engine (scoreRoutes), затем cr-tz4-why-generator (applyWhyToRoutes), затем cr-ai-decision-layer, затем cr-tz1-drive-voice-ai-advice (getAIAdviceText, speakCurrentDecision, …), затем cr-route-cards-ui-cleanup, Decision UI (renderResults), модалка сравнения (openRouteDetails), слой выезда (drive entry), далее TZ6…
 * 3) Контроль после правок слоёв: node scripts/build.mjs --verify-only (или npm run build:check);
 *    вручную: карта, маршрут, GPS (через http://localhost, не file://).
 * --- конец ТЗ-0 ---
 *
 * --- ТЗ-1. Окружение и диагностика (карта / GPS / голос не из-за «забытого» слоя в билде) ---
 * 1) Открывать приложение только по HTTP: http://localhost:PORT или http://127.0.0.1:PORT из dist\.
 *    Не открывать dist\index.html как file:// — Maps, Places и geolocation часто ведут себя некорректно.
 * 2) Ключ Google Maps: переменная CLEAR_ROAD_MAPS_API_KEY или GOOGLE_MAPS_API_KEY при сборке;
 *    либо первая строка src/secrets/maps-api-key.txt (файл не коммитить с прод-ключом).
 *    В Google Cloud Console для ключа задать ограничение по HTTP referrer под ваш хост (например http://localhost:3000/*).
 *    Прод-сборка: npm run build:prod (--require-maps-key) — без ключа сборка падает.
 * 3) Быстрая диагностика в браузере: добавить к URL ?cr_selfcheck=1 — в консоли таблица (google.maps, карта, GPS, Places).
 *    При ошибках ключа смотреть консоль: gm_authFailure, RefererNotAllowedMapError, InvalidKeyMapError.
 * 4) GPS: разрешение браузера «Местоположение»; на localhost обычно допустимо; голос/Web Speech — HTTPS или localhost, микрофон по запросу.
 * --- конец ТЗ-1 ---
 *
 * --- ТЗ-2. Картографирование монолита ---
 * Полная карта с якорями (поиск по файлу) и порядком выноса [v01]… зафиксирована в input/index.html
 * в начале основного <script>: блок «ТЗ-2. КАРТА МОНОЛИТА» сразу после CLEAR_ROAD_MAINTAINER_INDEX.
 * Номера строк намеренно не дублируются здесь — они плывут при правках; ориентир только якорные строки.
 * --- конец ТЗ-2 ---
 *
 * CSS: src/styles/app.css → __CLEAR_ROAD_BUILD_CSS_PLACEHOLDER__
 * i18n: src/i18n/app-i18n.js → __CLEAR_ROAD_BUILD_I18N_PLACEHOLDER__
 * cr-empty-state: src/js/cr-route-empty-state-final-v2.js → __CLEAR_ROAD_BUILD_JS_EMPTY_STATE_V2__
 * cr-tz1-directions-route-extract: src/js/cr-tz1-directions-route-extract.js → __CLEAR_ROAD_BUILD_JS_TZ1_DIRECTIONS_ROUTE_EXTRACT__ (первый внешний script после основного inline </script>, до cr-tz1-route-metrics-traffic)
 * cr-tz1-route-metrics-traffic: src/js/cr-tz1-route-metrics-traffic.js → __CLEAR_ROAD_BUILD_JS_TZ1_ROUTE_METRICS_TRAFFIC__ (после cr-tz1-directions-route-extract, до cr-tz1-route-role-segments; в основном script должны остаться глобальные t, stripHtml до вызовов)
 * cr-tz1-route-role-segments: src/js/cr-tz1-route-role-segments.js → __CLEAR_ROAD_BUILD_JS_TZ1_ROUTE_ROLE_SEGMENTS__ (после cr-tz1-route-metrics-traffic, до cr-tz1-drive-gps-warnings)
 * cr-tz1-drive-gps-warnings: src/js/cr-tz1-drive-gps-warnings.js → __CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_GPS_WARNINGS__ (после cr-tz1-route-role-segments, до cr-tz1-drive-voice-timed-warnings)
 * cr-tz1-drive-voice-timed-warnings: src/js/cr-tz1-drive-voice-timed-warnings.js → __CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_VOICE_TIMED_WARNINGS__ (после cr-tz1-drive-gps-warnings, до cr-tz1-drive-voice-nav-turns)
 * cr-tz1-drive-voice-nav-turns: src/js/cr-tz1-drive-voice-nav-turns.js → __CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_VOICE_NAV_TURNS__ (после cr-tz1-drive-voice-timed-warnings, до cr-tz2-normalization-layer)
 * cr-tz2-normalization-layer: src/js/cr-tz2-normalization-layer.js → __CLEAR_ROAD_BUILD_JS_TZ2_NORMALIZATION_LAYER__ (после cr-tz1-drive-voice-nav-turns, до cr-tz1-tz2-decision-helpers)
 * cr-tz1-tz2-decision-helpers: src/js/cr-tz1-tz2-decision-helpers.js → __CLEAR_ROAD_BUILD_JS_TZ1_TZ2_DECISION_HELPERS__ (после cr-tz2-normalization-layer, до cr-tz3-score-engine; ТЗ-1 patch + ТЗ-2 decision helpers)
 * cr-tz3-score-engine: src/js/cr-tz3-score-engine.js → __CLEAR_ROAD_BUILD_JS_TZ3_SCORE_ENGINE__ (после cr-tz1-tz2-decision-helpers, до cr-tz4-why-generator; нужен для scoreRoutes в AI decision и обёрток TZ4 UAE / TZ5 filters)
 * cr-tz4-why-generator: src/js/cr-tz4-why-generator.js → __CLEAR_ROAD_BUILD_JS_TZ4_WHY_GENERATOR__ (после cr-tz3-score-engine, до cr-ai-decision-layer; buildCanonicalDecisionState вызывает applyWhyToRoutes)
 * cr-ai-decision-layer: src/js/cr-ai-decision-layer.js → __CLEAR_ROAD_BUILD_JS_AI_DECISION_LAYER__ (после cr-tz4-why-generator, до cr-tz1-drive-voice-ai-advice)
 * cr-tz1-drive-voice-ai-advice: src/js/cr-tz1-drive-voice-ai-advice.js → __CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_VOICE_AI_ADVICE__ (после cr-ai-decision-layer, до cr-route-cards-ui-cleanup; нужны calculateConfidence, _tz1EscapeHTML из уже загруженных слоёв)
 * cr-route-cards-ui-cleanup: src/js/cr-route-cards-ui-cleanup.js → __CLEAR_ROAD_BUILD_JS_ROUTE_CARDS_UI_CLEANUP__ (после cr-tz1-drive-voice-ai-advice, до cr-render-results-decision-ui)
 * cr-render-results-decision-ui: src/js/cr-render-results-decision-ui.js → __CLEAR_ROAD_BUILD_JS_RENDER_RESULTS_DECISION_UI__ (после cr-route-cards-ui-cleanup, до cr-route-compare-modal-ui)
 * cr-route-compare-modal-ui: src/js/cr-route-compare-modal-ui.js → __CLEAR_ROAD_BUILD_JS_ROUTE_COMPARE_MODAL_UI__ (после cr-render-results-decision-ui, до cr-drive-start-nav-entry)
 * cr-drive-start-nav-entry: src/js/cr-drive-start-nav-entry.js → __CLEAR_ROAD_BUILD_JS_DRIVE_START_NAV__ (после cr-route-compare-modal-ui, до tz6-production-safety)
 * tz6-production-safety: src/js/cr-tz6-production-safety-layer.js → __CLEAR_ROAD_BUILD_JS_TZ6_PRODUCTION_SAFETY__ (после cr-drive-start-nav-entry, до tz2-gps-stability)
 * tz2-gps-stability: src/js/cr-tz2-gps-stability-layer.js → __CLEAR_ROAD_BUILD_JS_TZ2_GPS_STABILITY__ (после tz6-production-safety, до tz7-live-recalc)
 * tz7-live-recalc: src/js/cr-tz7-live-recalculation-layer.js → __CLEAR_ROAD_BUILD_JS_TZ7_LIVE_RECALC__ (после tz2-gps-stability, до tz3-predictive-stability)
 * tz3-predictive-stability: src/js/cr-tz3-predictive-stability-layer.js → __CLEAR_ROAD_BUILD_JS_TZ3_PREDICTIVE_STABILITY__ (после tz7-live-recalc, до tz4-uae-local)
 * tz4-uae-local: src/js/cr-tz4-uae-local-layer.js → __CLEAR_ROAD_BUILD_JS_TZ4_UAE_LOCAL__ (после tz3-predictive-stability, до tz5-filters)
 * tz5-filters: src/js/cr-tz5-filters-preferences-layer.js → __CLEAR_ROAD_BUILD_JS_TZ5_FILTERS__ (после tz4-uae-local, до tz6-quick-start)
 * tz6-quick-start: src/js/cr-tz6-quick-start-layer.js → __CLEAR_ROAD_BUILD_JS_TZ6_QUICK_START__ (после tz5-filters, до tz7-main-i18n)
 * tz7-main-i18n: src/js/cr-tz7-main-i18n-cleanup.js → __CLEAR_ROAD_BUILD_JS_TZ7_MAIN_I18N__ (после tz6-quick-start, до tz8-rtl)
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
 * tz10-ai-assistant: src/js/cr-tz10-ai-assistant.js → __CLEAR_ROAD_BUILD_JS_TZ10_AI_ASSISTANT__
 * tz11-cleanup: src/js/cr-tz11-cleanup.js → __CLEAR_ROAD_BUILD_JS_TZ11_CLEANUP__
 * tz12-audit: src/js/cr-tz12-final-audit.js → __CLEAR_ROAD_BUILD_JS_TZ12_FINAL_AUDIT__
 * tz13-voice: src/js/cr-tz13-premium-voice.js → __CLEAR_ROAD_BUILD_JS_TZ13_PREMIUM_VOICE__
 * tz1-tts-elevenlabs: src/js/cr-tz1-elevenlabs-tts.js → __CLEAR_ROAD_BUILD_JS_TZ1_TTS_ELEVENLABS__
 * tz2-route-integrity: src/js/cr-tz2-route-data-integrity.js → __CLEAR_ROAD_BUILD_JS_TZ2_ROUTE_INTEGRITY__
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
const tz1DirectionsRouteExtractJsFile = join(projectRoot, "src", "js", "cr-tz1-directions-route-extract.js");
const tz1RouteMetricsTrafficJsFile = join(projectRoot, "src", "js", "cr-tz1-route-metrics-traffic.js");
const tz1RouteRoleSegmentsJsFile = join(projectRoot, "src", "js", "cr-tz1-route-role-segments.js");
const tz1DriveGpsWarningsJsFile = join(projectRoot, "src", "js", "cr-tz1-drive-gps-warnings.js");
const tz1DriveVoiceTimedWarningsJsFile = join(projectRoot, "src", "js", "cr-tz1-drive-voice-timed-warnings.js");
const tz1DriveLaneTimedHudJsFile = join(projectRoot, "src", "js", "cr-tz1-drive-lane-timed-hud.js");
const tz1DriveUpcomingConditionJsFile = join(projectRoot, "src", "js", "cr-tz1-drive-upcoming-condition.js");
const tz1DriveMainInstructionJsFile = join(projectRoot, "src", "js", "cr-tz1-drive-main-instruction.js");
const tz1DriveVoiceNavTurnsJsFile = join(projectRoot, "src", "js", "cr-tz1-drive-voice-nav-turns.js");
const tz2NormalizationLayerJsFile = join(projectRoot, "src", "js", "cr-tz2-normalization-layer.js");
const tz1Tz2DecisionHelpersJsFile = join(projectRoot, "src", "js", "cr-tz1-tz2-decision-helpers.js");
const tz1DriveUpdateUiJsFile = join(projectRoot, "src", "js", "cr-tz1-drive-update-ui.js");
const tz3ScoreEngineJsFile = join(projectRoot, "src", "js", "cr-tz3-score-engine.js");
const tz4WhyGeneratorJsFile = join(projectRoot, "src", "js", "cr-tz4-why-generator.js");
const aiDecisionLayerJsFile = join(projectRoot, "src", "js", "cr-ai-decision-layer.js");
const tz1DriveVoiceAiAdviceJsFile = join(projectRoot, "src", "js", "cr-tz1-drive-voice-ai-advice.js");
const tz1DriveLiveGpsTrackingJsFile = join(projectRoot, "src", "js", "cr-tz1-drive-live-gps-tracking.js");
const routeCardsUiCleanupJsFile = join(projectRoot, "src", "js", "cr-route-cards-ui-cleanup.js");
const renderResultsDecisionUiJsFile = join(projectRoot, "src", "js", "cr-render-results-decision-ui.js");
const routeCompareModalUiJsFile = join(projectRoot, "src", "js", "cr-route-compare-modal-ui.js");
const driveStartNavJsFile = join(projectRoot, "src", "js", "cr-drive-start-nav-entry.js");
const tz6ProductionSafetyJsFile = join(projectRoot, "src", "js", "cr-tz6-production-safety-layer.js");
const tz2GpsStabilityJsFile = join(projectRoot, "src", "js", "cr-tz2-gps-stability-layer.js");
const tz7LiveRecalculationJsFile = join(projectRoot, "src", "js", "cr-tz7-live-recalculation-layer.js");
const tz3PredictiveStabilityJsFile = join(projectRoot, "src", "js", "cr-tz3-predictive-stability-layer.js");
const tz4UaeLocalJsFile = join(projectRoot, "src", "js", "cr-tz4-uae-local-layer.js");
const tz5FiltersJsFile = join(projectRoot, "src", "js", "cr-tz5-filters-preferences-layer.js");
const tz6QuickStartJsFile = join(projectRoot, "src", "js", "cr-tz6-quick-start-layer.js");
const tz7MainI18nJsFile = join(projectRoot, "src", "js", "cr-tz7-main-i18n-cleanup.js");
const tz8RtlJsFile = join(projectRoot, "src", "js", "tz8-rtl-layer.js");
const uxSelfCheckJsFile = join(projectRoot, "src", "js", "cr-ux-self-check.js");
const tz9VoiceJsFile = join(projectRoot, "src", "js", "tz9-voice-layer.js");
const tz10AiAssistantJsFile = join(projectRoot, "src", "js", "cr-tz10-ai-assistant.js");
const tz11CleanupJsFile = join(projectRoot, "src", "js", "cr-tz11-cleanup.js");
const tz12FinalAuditJsFile = join(projectRoot, "src", "js", "cr-tz12-final-audit.js");
const tz13PremiumVoiceJsFile = join(projectRoot, "src", "js", "cr-tz13-premium-voice.js");
const tz1ElevenlabsTtsJsFile = join(projectRoot, "src", "js", "cr-tz1-elevenlabs-tts.js");
const tz2RouteIntegrityJsFile = join(projectRoot, "src", "js", "cr-tz2-route-data-integrity.js");
const crRerouteDecisionJsFile = join(projectRoot, "src", "js", "cr-reroute-decision.js");
const crDriveBindingJsFile = join(projectRoot, "src", "js", "cr-drive-binding.js");
const crPredictiveLayerJsFile = join(projectRoot, "src", "js", "cr-predictive-layer.js");
const crRoutingCoreJsFile = join(projectRoot, "src", "js", "cr-routing-core.js");
const crAutocompleteGeoJsFile = join(projectRoot, "src", "js", "cr-autocomplete-geo.js");
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
const PLACEHOLDER_TZ1_DIRECTIONS_ROUTE_EXTRACT_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DIRECTIONS_ROUTE_EXTRACT__";
const PLACEHOLDER_TZ1_ROUTE_METRICS_TRAFFIC_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_ROUTE_METRICS_TRAFFIC__";
const PLACEHOLDER_TZ1_ROUTE_ROLE_SEGMENTS_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_ROUTE_ROLE_SEGMENTS__";
const PLACEHOLDER_TZ1_DRIVE_GPS_WARNINGS_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_GPS_WARNINGS__";
const PLACEHOLDER_TZ1_DRIVE_VOICE_TIMED_WARNINGS_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_VOICE_TIMED_WARNINGS__";
const PLACEHOLDER_TZ1_DRIVE_LANE_TIMED_HUD_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_LANE_TIMED_HUD__";
const PLACEHOLDER_TZ1_DRIVE_UPCOMING_CONDITION_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_UPCOMING_CONDITION__";
const PLACEHOLDER_TZ1_DRIVE_MAIN_INSTRUCTION_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_MAIN_INSTRUCTION__";
const PLACEHOLDER_TZ1_DRIVE_VOICE_NAV_TURNS_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_VOICE_NAV_TURNS__";
const PLACEHOLDER_TZ2_NORMALIZATION_LAYER_JS = "__CLEAR_ROAD_BUILD_JS_TZ2_NORMALIZATION_LAYER__";
const PLACEHOLDER_TZ1_TZ2_DECISION_HELPERS_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_TZ2_DECISION_HELPERS__";
const PLACEHOLDER_TZ1_DRIVE_UPDATE_UI_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_UPDATE_UI__";
const PLACEHOLDER_TZ3_SCORE_ENGINE_JS = "__CLEAR_ROAD_BUILD_JS_TZ3_SCORE_ENGINE__";
const PLACEHOLDER_TZ4_WHY_GENERATOR_JS = "__CLEAR_ROAD_BUILD_JS_TZ4_WHY_GENERATOR__";
const PLACEHOLDER_AI_DECISION_LAYER_JS = "__CLEAR_ROAD_BUILD_JS_AI_DECISION_LAYER__";
const PLACEHOLDER_TZ1_DRIVE_VOICE_AI_ADVICE_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_VOICE_AI_ADVICE__";
const PLACEHOLDER_TZ1_DRIVE_LIVE_GPS_TRACKING_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_DRIVE_LIVE_GPS_TRACKING__";
const PLACEHOLDER_ROUTE_CARDS_UI_CLEANUP_JS = "__CLEAR_ROAD_BUILD_JS_ROUTE_CARDS_UI_CLEANUP__";
const PLACEHOLDER_RENDER_RESULTS_DECISION_UI_JS = "__CLEAR_ROAD_BUILD_JS_RENDER_RESULTS_DECISION_UI__";
const PLACEHOLDER_ROUTE_COMPARE_MODAL_UI_JS = "__CLEAR_ROAD_BUILD_JS_ROUTE_COMPARE_MODAL_UI__";
const PLACEHOLDER_DRIVE_START_NAV_JS = "__CLEAR_ROAD_BUILD_JS_DRIVE_START_NAV__";
const PLACEHOLDER_TZ6_PRODUCTION_SAFETY_JS = "__CLEAR_ROAD_BUILD_JS_TZ6_PRODUCTION_SAFETY__";
const PLACEHOLDER_TZ2_GPS_STABILITY_JS = "__CLEAR_ROAD_BUILD_JS_TZ2_GPS_STABILITY__";
const PLACEHOLDER_TZ7_LIVE_RECALC_JS = "__CLEAR_ROAD_BUILD_JS_TZ7_LIVE_RECALC__";
const PLACEHOLDER_TZ3_PREDICTIVE_STABILITY_JS = "__CLEAR_ROAD_BUILD_JS_TZ3_PREDICTIVE_STABILITY__";
const PLACEHOLDER_TZ4_UAE_LOCAL_JS = "__CLEAR_ROAD_BUILD_JS_TZ4_UAE_LOCAL__";
const PLACEHOLDER_TZ5_FILTERS_JS = "__CLEAR_ROAD_BUILD_JS_TZ5_FILTERS__";
const PLACEHOLDER_TZ6_QUICK_START_JS = "__CLEAR_ROAD_BUILD_JS_TZ6_QUICK_START__";
const PLACEHOLDER_TZ7_MAIN_I18N_JS = "__CLEAR_ROAD_BUILD_JS_TZ7_MAIN_I18N__";
const PLACEHOLDER_TZ8_RTL_JS = "__CLEAR_ROAD_BUILD_JS_TZ8_RTL__";
const PLACEHOLDER_UX_SELF_CHECK_JS = "__CLEAR_ROAD_BUILD_JS_UX_SELF_CHECK__";
const PLACEHOLDER_TZ9_VOICE_JS = "__CLEAR_ROAD_BUILD_JS_TZ9_VOICE__";
const PLACEHOLDER_TZ10_AI_ASSISTANT_JS = "__CLEAR_ROAD_BUILD_JS_TZ10_AI_ASSISTANT__";
const PLACEHOLDER_TZ11_CLEANUP_JS = "__CLEAR_ROAD_BUILD_JS_TZ11_CLEANUP__";
const PLACEHOLDER_TZ12_FINAL_AUDIT_JS = "__CLEAR_ROAD_BUILD_JS_TZ12_FINAL_AUDIT__";
const PLACEHOLDER_TZ13_PREMIUM_VOICE_JS = "__CLEAR_ROAD_BUILD_JS_TZ13_PREMIUM_VOICE__";
const PLACEHOLDER_TZ1_TTS_ELEVENLABS_JS = "__CLEAR_ROAD_BUILD_JS_TZ1_TTS_ELEVENLABS__";
const PLACEHOLDER_TZ2_ROUTE_INTEGRITY_JS = "__CLEAR_ROAD_BUILD_JS_TZ2_ROUTE_INTEGRITY__";
const PLACEHOLDER_CR_REROUTE_DECISION_JS = "__CLEAR_ROAD_BUILD_JS_CR_REROUTE_DECISION__";
const PLACEHOLDER_CR_DRIVE_BINDING_JS = "__CLEAR_ROAD_BUILD_JS_CR_DRIVE_BINDING__";
const PLACEHOLDER_CR_PREDICTIVE_LAYER_JS = "__CLEAR_ROAD_BUILD_JS_CR_PREDICTIVE_LAYER__";
const PLACEHOLDER_CR_ROUTING_CORE_JS = "__CLEAR_ROAD_BUILD_JS_CR_ROUTING_CORE__";
const PLACEHOLDER_CR_AUTOCOMPLETE_GEO_JS = "__CLEAR_ROAD_BUILD_JS_CR_AUTOCOMPLETE_GEO__";
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

function injectTz1DirectionsRouteExtractJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DIRECTIONS_ROUTE_EXTRACT_JS)) return html;
  if (!existsSync(tz1DirectionsRouteExtractJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 directions route extract, но нет файла:", tz1DirectionsRouteExtractJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DirectionsRouteExtractJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 directions route extract:", tz1DirectionsRouteExtractJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function extractRoutesFromDirectionsResult") ||
    !js.includes("function validateExtractedRoutes")
  ) {
    console.error(
      "TZ1 directions route extract: ожидаются extractRoutesFromDirectionsResult и validateExtractedRoutes:",
      tz1DirectionsRouteExtractJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DIRECTIONS_ROUTE_EXTRACT_JS).join(js);
}

function injectTz1RouteMetricsTrafficJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_ROUTE_METRICS_TRAFFIC_JS)) return html;
  if (!existsSync(tz1RouteMetricsTrafficJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 route metrics/traffic, но нет файла:", tz1RouteMetricsTrafficJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1RouteMetricsTrafficJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 route metrics/traffic:", tz1RouteMetricsTrafficJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function calculateRouteMetrics") ||
    !js.includes("function trafficRank") ||
    !js.includes("function getStressBadge")
  ) {
    console.error(
      "TZ1 route metrics/traffic: ожидаются calculateRouteMetrics, trafficRank, getStressBadge:",
      tz1RouteMetricsTrafficJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_ROUTE_METRICS_TRAFFIC_JS).join(js);
}

function injectTz1RouteRoleSegmentsJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_ROUTE_ROLE_SEGMENTS_JS)) return html;
  if (!existsSync(tz1RouteRoleSegmentsJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 route role/segments, но нет файла:", tz1RouteRoleSegmentsJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1RouteRoleSegmentsJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 route role/segments:", tz1RouteRoleSegmentsJsFile);
    process.exit(1);
  }
  if (!js.includes("function getRouteRole") || !js.includes("function buildRouteSegments")) {
    console.error(
      "TZ1 route role/segments: ожидаются getRouteRole и buildRouteSegments:",
      tz1RouteRoleSegmentsJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_ROUTE_ROLE_SEGMENTS_JS).join(js);
}

function injectTz1DriveGpsWarningsJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DRIVE_GPS_WARNINGS_JS)) return html;
  if (!existsSync(tz1DriveGpsWarningsJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 drive/GPS/warnings, но нет файла:", tz1DriveGpsWarningsJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DriveGpsWarningsJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 drive/GPS/warnings:", tz1DriveGpsWarningsJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function buildDriveViewModel") ||
    !js.includes("function getDistanceToStepEndMeters") ||
    !js.includes("function getLiveRemainingMeters") ||
    !js.includes("function getWarningPhaseForType") ||
    !js.includes("function getEffectiveDistanceToStepMeters")
  ) {
    console.error(
      "TZ1 drive/GPS/warnings: ожидаются buildDriveViewModel, getLiveRemainingMeters, getDistanceToStepEndMeters, getWarningPhaseForType, getEffectiveDistanceToStepMeters:",
      tz1DriveGpsWarningsJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DRIVE_GPS_WARNINGS_JS).join(js);
}

function injectTz1DriveVoiceTimedWarningsJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DRIVE_VOICE_TIMED_WARNINGS_JS)) return html;
  if (!existsSync(tz1DriveVoiceTimedWarningsJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 drive voice/timed warnings, но нет файла:", tz1DriveVoiceTimedWarningsJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DriveVoiceTimedWarningsJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 drive voice/timed warnings:", tz1DriveVoiceTimedWarningsJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function buildTimedWarning") ||
    !js.includes("function normalizeVoiceText") ||
    !js.includes("function speakDriveInstruction")
  ) {
    console.error(
      "TZ1 drive voice/timed warnings: ожидаются buildTimedWarning, normalizeVoiceText, speakDriveInstruction:",
      tz1DriveVoiceTimedWarningsJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DRIVE_VOICE_TIMED_WARNINGS_JS).join(js);
}

function injectTz1DriveLaneTimedHudJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DRIVE_LANE_TIMED_HUD_JS)) return html;
  if (!existsSync(tz1DriveLaneTimedHudJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 drive lane/timed HUD, но нет файла:", tz1DriveLaneTimedHudJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DriveLaneTimedHudJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 drive lane/timed HUD:", tz1DriveLaneTimedHudJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function getDriveTimedWarning") ||
    !js.includes("function getDriveLaneGuidance") ||
    !js.includes("function buildLaneGuidanceText")
  ) {
    console.error(
      "TZ1 drive lane/timed HUD: ожидаются getDriveTimedWarning, getDriveLaneGuidance, buildLaneGuidanceText:",
      tz1DriveLaneTimedHudJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DRIVE_LANE_TIMED_HUD_JS).join(js);
}

function injectTz1DriveUpcomingConditionJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DRIVE_UPCOMING_CONDITION_JS)) return html;
  if (!existsSync(tz1DriveUpcomingConditionJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 drive upcoming condition, но нет файла:", tz1DriveUpcomingConditionJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DriveUpcomingConditionJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 drive upcoming condition:", tz1DriveUpcomingConditionJsFile);
    process.exit(1);
  }
  if (!js.includes("function getUpcomingCondition")) {
    console.error("TZ1 drive upcoming condition: ожидается getUpcomingCondition:", tz1DriveUpcomingConditionJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DRIVE_UPCOMING_CONDITION_JS).join(js);
}

function injectTz1DriveMainInstructionJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DRIVE_MAIN_INSTRUCTION_JS)) return html;
  if (!existsSync(tz1DriveMainInstructionJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 drive main instruction, но нет файла:", tz1DriveMainInstructionJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DriveMainInstructionJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 drive main instruction:", tz1DriveMainInstructionJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function getCleanDriveMainInstruction") ||
    !js.includes("function formatDriveMeters") ||
    !js.includes("function getDriveIcon")
  ) {
    console.error(
      "TZ1 drive main instruction: ожидаются getCleanDriveMainInstruction, formatDriveMeters, getDriveIcon:",
      tz1DriveMainInstructionJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DRIVE_MAIN_INSTRUCTION_JS).join(js);
}

function injectTz1DriveVoiceNavTurnsJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DRIVE_VOICE_NAV_TURNS_JS)) return html;
  if (!existsSync(tz1DriveVoiceNavTurnsJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 drive voice nav turns, но нет файла:", tz1DriveVoiceNavTurnsJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DriveVoiceNavTurnsJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 drive voice nav turns:", tz1DriveVoiceNavTurnsJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function speakStartNavigation") ||
    !js.includes("function maybeSpeakDriveNavigation") ||
    !js.includes("function getRouteStepsForVoice")
  ) {
    console.error(
      "TZ1 drive voice nav turns: ожидаются getRouteStepsForVoice, speakStartNavigation, maybeSpeakDriveNavigation:",
      tz1DriveVoiceNavTurnsJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DRIVE_VOICE_NAV_TURNS_JS).join(js);
}

function injectTz2NormalizationLayerJs(html) {
  if (!html.includes(PLACEHOLDER_TZ2_NORMALIZATION_LAYER_JS)) return html;
  if (!existsSync(tz2NormalizationLayerJsFile)) {
    console.error("В HTML есть плейсхолдер TZ2 normalization layer, но нет файла:", tz2NormalizationLayerJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz2NormalizationLayerJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ2 normalization layer:", tz2NormalizationLayerJsFile);
    process.exit(1);
  }
  if (!js.includes("function normalizeRoute") || !js.includes("function normalizeRoutes") || !js.includes("function validateNormalizedRoutes")) {
    console.error("TZ2 normalization layer: ожидаются normalizeRoute, normalizeRoutes, validateNormalizedRoutes:", tz2NormalizationLayerJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ2_NORMALIZATION_LAYER_JS).join(js);
}

function injectTz1Tz2DecisionHelpersJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_TZ2_DECISION_HELPERS_JS)) return html;
  if (!existsSync(tz1Tz2DecisionHelpersJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1+TZ2 decision helpers, но нет файла:", tz1Tz2DecisionHelpersJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1Tz2DecisionHelpersJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1+TZ2 decision helpers:", tz1Tz2DecisionHelpersJsFile);
    process.exit(1);
  }
  if (!js.includes("function _tz1Minutes") || !js.includes("function _tz2TollCost")) {
    console.error("TZ1+TZ2 decision helpers: ожидаются _tz1Minutes и _tz2TollCost:", tz1Tz2DecisionHelpersJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_TZ2_DECISION_HELPERS_JS).join(js);
}

function injectTz1DriveUpdateUiJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DRIVE_UPDATE_UI_JS)) return html;
  if (!existsSync(tz1DriveUpdateUiJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 drive update UI, но нет файла:", tz1DriveUpdateUiJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DriveUpdateUiJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 drive update UI:", tz1DriveUpdateUiJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function updateDriveUI") ||
    !js.includes("function applySmoothedDriveEta") ||
    !js.includes("_driveDisplayedEtaMin")
  ) {
    console.error(
      "TZ1 drive update UI: ожидаются updateDriveUI, applySmoothedDriveEta, состояние ETA:",
      tz1DriveUpdateUiJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DRIVE_UPDATE_UI_JS).join(js);
}

function injectTz3ScoreEngineJs(html) {
  if (!html.includes(PLACEHOLDER_TZ3_SCORE_ENGINE_JS)) return html;
  if (!existsSync(tz3ScoreEngineJsFile)) {
    console.error("В HTML есть плейсхолдер TZ3 score engine, но нет файла:", tz3ScoreEngineJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz3ScoreEngineJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ3 score engine:", tz3ScoreEngineJsFile);
    process.exit(1);
  }
  if (!js.includes("function scoreRoute") || !js.includes("function scoreRoutes") || !js.includes("function validateScoredRoutes")) {
    console.error("TZ3 score engine: ожидаются scoreRoute, scoreRoutes, validateScoredRoutes:", tz3ScoreEngineJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ3_SCORE_ENGINE_JS).join(js);
}

function injectTz4WhyGeneratorJs(html) {
  if (!html.includes(PLACEHOLDER_TZ4_WHY_GENERATOR_JS)) return html;
  if (!existsSync(tz4WhyGeneratorJsFile)) {
    console.error("В HTML есть плейсхолдер TZ4 WHY generator, но нет файла:", tz4WhyGeneratorJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz4WhyGeneratorJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ4 WHY generator:", tz4WhyGeneratorJsFile);
    process.exit(1);
  }
  if (!js.includes("function applyWhyToRoutes") || !js.includes("function generateWhy")) {
    console.error("TZ4 WHY generator: ожидаются applyWhyToRoutes и generateWhy:", tz4WhyGeneratorJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ4_WHY_GENERATOR_JS).join(js);
}

function injectAiDecisionLayerJs(html) {
  if (!html.includes(PLACEHOLDER_AI_DECISION_LAYER_JS)) return html;
  if (!existsSync(aiDecisionLayerJsFile)) {
    console.error("В HTML есть плейсхолдер AI decision layer, но нет файла:", aiDecisionLayerJsFile);
    process.exit(1);
  }
  const js = readFileSync(aiDecisionLayerJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой AI decision layer:", aiDecisionLayerJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_AI_DECISION_LAYER_JS).join(js);
}

function injectTz1DriveVoiceAiAdviceJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DRIVE_VOICE_AI_ADVICE_JS)) return html;
  if (!existsSync(tz1DriveVoiceAiAdviceJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 drive voice AI advice, но нет файла:", tz1DriveVoiceAiAdviceJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DriveVoiceAiAdviceJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 drive voice AI advice:", tz1DriveVoiceAiAdviceJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function getAIAdviceText") ||
    !js.includes("function speakCurrentDecision") ||
    !js.includes("function getBestComparableAlternative")
  ) {
    console.error(
      "TZ1 drive voice AI advice: ожидаются getBestComparableAlternative, getAIAdviceText, speakCurrentDecision:",
      tz1DriveVoiceAiAdviceJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DRIVE_VOICE_AI_ADVICE_JS).join(js);
}

function injectCrRerouteDecisionJs(html) {
  if (!html.includes(PLACEHOLDER_CR_REROUTE_DECISION_JS)) return html;
  if (!existsSync(crRerouteDecisionJsFile)) {
    console.error("В HTML есть плейсхолдер cr-reroute-decision, но нет файла:", crRerouteDecisionJsFile);
    process.exit(1);
  }
  const js = readFileSync(crRerouteDecisionJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой cr-reroute-decision:", crRerouteDecisionJsFile);
    process.exit(1);
  }
  if (!js.includes("function getRerouteDecision")) {
    console.error("cr-reroute-decision: ожидается getRerouteDecision:", crRerouteDecisionJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_CR_REROUTE_DECISION_JS).join(js);
}

function injectCrDriveBindingJs(html) {
  if (!html.includes(PLACEHOLDER_CR_DRIVE_BINDING_JS)) return html;
  if (!existsSync(crDriveBindingJsFile)) {
    console.error("В HTML есть плейсхолдер cr-drive-binding, но нет файла:", crDriveBindingJsFile);
    process.exit(1);
  }
  const js = readFileSync(crDriveBindingJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой cr-drive-binding:", crDriveBindingJsFile);
    process.exit(1);
  }
  if (!js.includes("function exitDriveMode")) {
    console.error("cr-drive-binding: ожидается exitDriveMode:", crDriveBindingJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_CR_DRIVE_BINDING_JS).join(js);
}

function injectCrPredictiveLayerJs(html) {
  if (!html.includes(PLACEHOLDER_CR_PREDICTIVE_LAYER_JS)) return html;
  if (!existsSync(crPredictiveLayerJsFile)) {
    console.error("В HTML есть плейсхолдер cr-predictive-layer, но нет файла:", crPredictiveLayerJsFile);
    process.exit(1);
  }
  const js = readFileSync(crPredictiveLayerJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой cr-predictive-layer:", crPredictiveLayerJsFile);
    process.exit(1);
  }
  if (!js.includes("function runPredictiveCheck")) {
    console.error("cr-predictive-layer: ожидается runPredictiveCheck:", crPredictiveLayerJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_CR_PREDICTIVE_LAYER_JS).join(js);
}

function injectCrRoutingCoreJs(html) {
  if (!html.includes(PLACEHOLDER_CR_ROUTING_CORE_JS)) return html;
  if (!existsSync(crRoutingCoreJsFile)) {
    console.error("В HTML есть плейсхолдер cr-routing-core, но нет файла:", crRoutingCoreJsFile);
    process.exit(1);
  }
  const js = readFileSync(crRoutingCoreJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой cr-routing-core:", crRoutingCoreJsFile);
    process.exit(1);
  }
  if (!js.includes("function calculateRoutes") || !js.includes("function drawRoutes")) {
    console.error("cr-routing-core: ожидаются calculateRoutes и drawRoutes:", crRoutingCoreJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_CR_ROUTING_CORE_JS).join(js);
}

function injectCrAutocompleteGeoJs(html) {
  if (!html.includes(PLACEHOLDER_CR_AUTOCOMPLETE_GEO_JS)) return html;
  if (!existsSync(crAutocompleteGeoJsFile)) {
    console.error("В HTML есть плейсхолдер cr-autocomplete-geo, но нет файла:", crAutocompleteGeoJsFile);
    process.exit(1);
  }
  const js = readFileSync(crAutocompleteGeoJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой cr-autocomplete-geo:", crAutocompleteGeoJsFile);
    process.exit(1);
  }
  if (!js.includes("function initAutocomplete") || !js.includes("function patchGpsEntrypoints")) {
    console.error("cr-autocomplete-geo: ожидаются initAutocomplete и patchGpsEntrypoints:", crAutocompleteGeoJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_CR_AUTOCOMPLETE_GEO_JS).join(js);
}

function injectTz1DriveLiveGpsTrackingJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_DRIVE_LIVE_GPS_TRACKING_JS)) return html;
  if (!existsSync(tz1DriveLiveGpsTrackingJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 drive live GPS tracking, но нет файла:", tz1DriveLiveGpsTrackingJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1DriveLiveGpsTrackingJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 drive live GPS tracking:", tz1DriveLiveGpsTrackingJsFile);
    process.exit(1);
  }
  if (
    !js.includes("function handleLiveDrivePosition") ||
    !js.includes("function startLiveDriveTracking") ||
    !js.includes("function stopLiveDriveTracking")
  ) {
    console.error(
      "TZ1 drive live GPS tracking: ожидаются handleLiveDrivePosition, startLiveDriveTracking, stopLiveDriveTracking:",
      tz1DriveLiveGpsTrackingJsFile
    );
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_DRIVE_LIVE_GPS_TRACKING_JS).join(js);
}

function injectRouteCardsUiCleanupJs(html) {
  if (!html.includes(PLACEHOLDER_ROUTE_CARDS_UI_CLEANUP_JS)) return html;
  if (!existsSync(routeCardsUiCleanupJsFile)) {
    console.error("В HTML есть плейсхолдер route-cards UI cleanup, но нет файла:", routeCardsUiCleanupJsFile);
    process.exit(1);
  }
  const js = readFileSync(routeCardsUiCleanupJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой route-cards UI cleanup:", routeCardsUiCleanupJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_ROUTE_CARDS_UI_CLEANUP_JS).join(js);
}

function injectRenderResultsDecisionUiJs(html) {
  if (!html.includes(PLACEHOLDER_RENDER_RESULTS_DECISION_UI_JS)) return html;
  if (!existsSync(renderResultsDecisionUiJsFile)) {
    console.error("В HTML есть плейсхолдер render-results decision UI, но нет файла:", renderResultsDecisionUiJsFile);
    process.exit(1);
  }
  const js = readFileSync(renderResultsDecisionUiJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой render-results decision UI:", renderResultsDecisionUiJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_RENDER_RESULTS_DECISION_UI_JS).join(js);
}

function injectRouteCompareModalUiJs(html) {
  if (!html.includes(PLACEHOLDER_ROUTE_COMPARE_MODAL_UI_JS)) return html;
  if (!existsSync(routeCompareModalUiJsFile)) {
    console.error("В HTML есть плейсхолдер route-compare modal UI, но нет файла:", routeCompareModalUiJsFile);
    process.exit(1);
  }
  const js = readFileSync(routeCompareModalUiJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой route-compare modal UI:", routeCompareModalUiJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_ROUTE_COMPARE_MODAL_UI_JS).join(js);
}

function injectDriveStartNavJs(html) {
  if (!html.includes(PLACEHOLDER_DRIVE_START_NAV_JS)) return html;
  if (!existsSync(driveStartNavJsFile)) {
    console.error("В HTML есть плейсхолдер drive start-nav entry, но нет файла:", driveStartNavJsFile);
    process.exit(1);
  }
  const js = readFileSync(driveStartNavJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой drive start-nav entry:", driveStartNavJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_DRIVE_START_NAV_JS).join(js);
}

function injectTz6ProductionSafetyJs(html) {
  if (!html.includes(PLACEHOLDER_TZ6_PRODUCTION_SAFETY_JS)) return html;
  if (!existsSync(tz6ProductionSafetyJsFile)) {
    console.error("В HTML есть плейсхолдер TZ6 production safety, но нет файла:", tz6ProductionSafetyJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz6ProductionSafetyJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ6 production safety:", tz6ProductionSafetyJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ6_PRODUCTION_SAFETY_JS).join(js);
}

function injectTz2GpsStabilityJs(html) {
  if (!html.includes(PLACEHOLDER_TZ2_GPS_STABILITY_JS)) return html;
  if (!existsSync(tz2GpsStabilityJsFile)) {
    console.error("В HTML есть плейсхолдер TZ2 GPS stability, но нет файла:", tz2GpsStabilityJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz2GpsStabilityJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ2 GPS stability:", tz2GpsStabilityJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ2_GPS_STABILITY_JS).join(js);
}

function injectTz7LiveRecalculationJs(html) {
  if (!html.includes(PLACEHOLDER_TZ7_LIVE_RECALC_JS)) return html;
  if (!existsSync(tz7LiveRecalculationJsFile)) {
    console.error("В HTML есть плейсхолдер TZ7 live recalculation, но нет файла:", tz7LiveRecalculationJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz7LiveRecalculationJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ7 live recalculation:", tz7LiveRecalculationJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ7_LIVE_RECALC_JS).join(js);
}

function injectTz3PredictiveStabilityJs(html) {
  if (!html.includes(PLACEHOLDER_TZ3_PREDICTIVE_STABILITY_JS)) return html;
  if (!existsSync(tz3PredictiveStabilityJsFile)) {
    console.error("В HTML есть плейсхолдер TZ3 predictive stability, но нет файла:", tz3PredictiveStabilityJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz3PredictiveStabilityJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ3 predictive stability:", tz3PredictiveStabilityJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ3_PREDICTIVE_STABILITY_JS).join(js);
}

function injectTz4UaeLocalJs(html) {
  if (!html.includes(PLACEHOLDER_TZ4_UAE_LOCAL_JS)) return html;
  if (!existsSync(tz4UaeLocalJsFile)) {
    console.error("В HTML есть плейсхолдер TZ4 UAE local, но нет файла:", tz4UaeLocalJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz4UaeLocalJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ4 UAE local:", tz4UaeLocalJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ4_UAE_LOCAL_JS).join(js);
}

function injectTz5FiltersJs(html) {
  if (!html.includes(PLACEHOLDER_TZ5_FILTERS_JS)) return html;
  if (!existsSync(tz5FiltersJsFile)) {
    console.error("В HTML есть плейсхолдер TZ5 filters, но нет файла:", tz5FiltersJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz5FiltersJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ5 filters:", tz5FiltersJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ5_FILTERS_JS).join(js);
}

function injectTz6QuickStartJs(html) {
  if (!html.includes(PLACEHOLDER_TZ6_QUICK_START_JS)) return html;
  if (!existsSync(tz6QuickStartJsFile)) {
    console.error("В HTML есть плейсхолдер TZ6 Quick Start, но нет файла:", tz6QuickStartJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz6QuickStartJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ6 Quick Start:", tz6QuickStartJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ6_QUICK_START_JS).join(js);
}

function injectTz7MainI18nJs(html) {
  if (!html.includes(PLACEHOLDER_TZ7_MAIN_I18N_JS)) return html;
  if (!existsSync(tz7MainI18nJsFile)) {
    console.error("В HTML есть плейсхолдер TZ7 main i18n, но нет файла:", tz7MainI18nJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz7MainI18nJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ7 main i18n:", tz7MainI18nJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ7_MAIN_I18N_JS).join(js);
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

function injectTz10AiAssistantJs(html) {
  if (!html.includes(PLACEHOLDER_TZ10_AI_ASSISTANT_JS)) return html;
  if (!existsSync(tz10AiAssistantJsFile)) {
    console.error("В HTML есть плейсхолдер TZ10 AI assistant, но нет файла:", tz10AiAssistantJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz10AiAssistantJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ10:", tz10AiAssistantJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ10_AI_ASSISTANT_JS).join(js);
}

function injectTz11CleanupJs(html) {
  if (!html.includes(PLACEHOLDER_TZ11_CLEANUP_JS)) return html;
  if (!existsSync(tz11CleanupJsFile)) {
    console.error("В HTML есть плейсхолдер TZ11, но нет файла:", tz11CleanupJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz11CleanupJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ11:", tz11CleanupJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ11_CLEANUP_JS).join(js);
}

function injectTz12FinalAuditJs(html) {
  if (!html.includes(PLACEHOLDER_TZ12_FINAL_AUDIT_JS)) return html;
  if (!existsSync(tz12FinalAuditJsFile)) {
    console.error("В HTML есть плейсхолдер TZ12, но нет файла:", tz12FinalAuditJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz12FinalAuditJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ12:", tz12FinalAuditJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ12_FINAL_AUDIT_JS).join(js);
}

function injectTz13PremiumVoiceJs(html) {
  if (!html.includes(PLACEHOLDER_TZ13_PREMIUM_VOICE_JS)) return html;
  if (!existsSync(tz13PremiumVoiceJsFile)) {
    console.error("В HTML есть плейсхолдер TZ13, но нет файла:", tz13PremiumVoiceJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz13PremiumVoiceJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ13:", tz13PremiumVoiceJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ13_PREMIUM_VOICE_JS).join(js);
}

function injectTz1ElevenlabsTtsJs(html) {
  if (!html.includes(PLACEHOLDER_TZ1_TTS_ELEVENLABS_JS)) return html;
  if (!existsSync(tz1ElevenlabsTtsJsFile)) {
    console.error("В HTML есть плейсхолдер TZ1 ElevenLabs TTS, но нет файла:", tz1ElevenlabsTtsJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz1ElevenlabsTtsJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ1 TTS:", tz1ElevenlabsTtsJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ1_TTS_ELEVENLABS_JS).join(js);
}

function injectTz2RouteIntegrityJs(html) {
  if (!html.includes(PLACEHOLDER_TZ2_ROUTE_INTEGRITY_JS)) return html;
  if (!existsSync(tz2RouteIntegrityJsFile)) {
    console.error("В HTML есть плейсхолдер TZ2 route integrity, но нет файла:", tz2RouteIntegrityJsFile);
    process.exit(1);
  }
  const js = readFileSync(tz2RouteIntegrityJsFile, "utf8");
  if (!js.trim()) {
    console.error("Пустой TZ2 integrity:", tz2RouteIntegrityJsFile);
    process.exit(1);
  }
  return html.split(PLACEHOLDER_TZ2_ROUTE_INTEGRITY_JS).join(js);
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
  if (html.includes(PLACEHOLDER_TZ1_DIRECTIONS_ROUTE_EXTRACT_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 directions route extract JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_ROUTE_METRICS_TRAFFIC_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 route metrics/traffic JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_ROUTE_ROLE_SEGMENTS_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 route role/segments JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_GPS_WARNINGS_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 drive/GPS/warnings JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_VOICE_TIMED_WARNINGS_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 drive voice/timed warnings JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_LANE_TIMED_HUD_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 drive lane/timed HUD JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_UPCOMING_CONDITION_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 drive upcoming condition JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_MAIN_INSTRUCTION_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 drive main instruction JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_VOICE_NAV_TURNS_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 drive voice nav turns JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ2_NORMALIZATION_LAYER_JS)) {
    console.error("В артефакте остался плейсхолдер TZ2 normalization layer JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_TZ2_DECISION_HELPERS_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1+TZ2 decision helpers JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_UPDATE_UI_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 drive update UI JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ3_SCORE_ENGINE_JS)) {
    console.error("В артефакте остался плейсхолдер TZ3 score engine JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ4_WHY_GENERATOR_JS)) {
    console.error("В артефакте остался плейсхолдер TZ4 WHY generator JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_AI_DECISION_LAYER_JS)) {
    console.error("В артефакте остался плейсхолдер AI decision layer JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_VOICE_AI_ADVICE_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 drive voice AI advice JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_CR_REROUTE_DECISION_JS)) {
    console.error("В артефакте остался плейсхолдер cr-reroute-decision JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_LIVE_GPS_TRACKING_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 drive live GPS tracking JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_CR_DRIVE_BINDING_JS)) {
    console.error("В артефакте остался плейсхолдер cr-drive-binding JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_ROUTE_CARDS_UI_CLEANUP_JS)) {
    console.error("В артефакте остался плейсхолдер route-cards UI cleanup JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_RENDER_RESULTS_DECISION_UI_JS)) {
    console.error("В артефакте остался плейсхолдер render-results decision UI JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_ROUTE_COMPARE_MODAL_UI_JS)) {
    console.error("В артефакте остался плейсхолдер route-compare modal UI JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_CR_PREDICTIVE_LAYER_JS)) {
    console.error("В артефакте остался плейсхолдер cr-predictive-layer JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_CR_ROUTING_CORE_JS)) {
    console.error("В артефакте остался плейсхолдер cr-routing-core JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_CR_AUTOCOMPLETE_GEO_JS)) {
    console.error("В артефакте остался плейсхолдер cr-autocomplete-geo JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_DRIVE_START_NAV_JS)) {
    console.error("В артефакте остался плейсхолдер drive start-nav entry JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ6_PRODUCTION_SAFETY_JS)) {
    console.error("В артефакте остался плейсхолдер TZ6 production safety JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ2_GPS_STABILITY_JS)) {
    console.error("В артефакте остался плейсхолдер TZ2 GPS stability JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ7_LIVE_RECALC_JS)) {
    console.error("В артефакте остался плейсхолдер TZ7 live recalculation JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ3_PREDICTIVE_STABILITY_JS)) {
    console.error("В артефакте остался плейсхолдер TZ3 predictive stability JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ4_UAE_LOCAL_JS)) {
    console.error("В артефакте остался плейсхолдер TZ4 UAE local JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ5_FILTERS_JS)) {
    console.error("В артефакте остался плейсхолдер TZ5 filters JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ6_QUICK_START_JS)) {
    console.error("В артефакте остался плейсхолдер TZ6 Quick Start JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ7_MAIN_I18N_JS)) {
    console.error("В артефакте остался плейсхолдер TZ7 main i18n JS — сборка не завершена.");
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
  if (html.includes(PLACEHOLDER_TZ10_AI_ASSISTANT_JS)) {
    console.error("В артефакте остался плейсхолдер TZ10 AI assistant JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ11_CLEANUP_JS)) {
    console.error("В артефакте остался плейсхолдер TZ11 cleanup JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ12_FINAL_AUDIT_JS)) {
    console.error("В артефакте остался плейсхолдер TZ12 final audit JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ13_PREMIUM_VOICE_JS)) {
    console.error("В артефакте остался плейсхолдер TZ13 premium voice JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ1_TTS_ELEVENLABS_JS)) {
    console.error("В артефакте остался плейсхолдер TZ1 ElevenLabs TTS JS — сборка не завершена.");
    process.exit(1);
  }
  if (html.includes(PLACEHOLDER_TZ2_ROUTE_INTEGRITY_JS)) {
    console.error("В артефакте остался плейсхолдер TZ2 route integrity JS — сборка не завершена.");
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
    ["TZ1 directions route extract v11", html.includes("function extractRoutesFromDirectionsResult") && html.includes("function validateExtractedRoutes")],
    ["TZ1 route metrics/traffic v12", html.includes("function calculateRouteMetrics") && html.includes("function trafficRank") && html.includes("function stepLooksLikeHighway")],
    ["TZ1 route role/segments v13", html.includes("function getRouteRole") && html.includes("function buildRouteSegments")],
    ["TZ1 drive/GPS/warnings v14", html.includes("function buildDriveViewModel") && html.includes("function getDistanceToStepEndMeters") && html.includes("function getStepWarningMeta") && html.includes("function getWarningPhaseForType") && html.includes("function getEffectiveDistanceToStepMeters")],
    ["TZ1 drive voice/timed warnings v15", html.includes("function buildTimedWarning") && html.includes("function normalizeVoiceText") && html.includes("function buildContextAwareVoicePrompt")],
    ["TZ1 drive lane/timed HUD v18", html.includes("function getDriveTimedWarning") && html.includes("function getDriveLaneGuidance") && html.includes("function buildLaneGuidanceText")],
    ["TZ1 drive upcoming condition v21 (getUpcomingCondition)", html.includes("function getUpcomingCondition")],
    ["TZ1 drive main instruction v19", html.includes("function getCleanDriveMainInstruction") && html.includes("function formatDriveMeters") && html.includes("function getNextMeaningfulDriveAction")],
    ["TZ1 drive voice nav turns v17", html.includes("function maybeSpeakDriveNavigation") && html.includes("function speakStartNavigation") && html.includes("function getRouteStepsForVoice")],
    ["TZ2 normalization layer v10 (normalizeRoute)", html.includes("function normalizeRoute") && html.includes("function validateNormalizedRoutes") && html.includes("function applyClearRoadRouteSanityMarks")],
    ["TZ1+TZ2 decision helpers v08 (_tz1Minutes)", html.includes("function _tz1Minutes") && html.includes("function _tz2TollCost") && html.includes("function _tz2BuildScoreBreakdown")],
    ["TZ1 drive update UI v20 (updateDriveUI)", html.includes("function updateDriveUI") && html.includes("function applySmoothedDriveEta")],
    ["TZ3 score engine (scoreRoute, scoreRoutes)", html.includes("function scoreRoute") && html.includes("function scoreRoutes") && html.includes("function validateScoredRoutes")],
    ["TZ4 WHY generator (generateWhy, applyWhyToRoutes)", html.includes("function generateWhy") && html.includes("function applyWhyToRoutes") && html.includes("function clearRoadOfficialBestRoute")],
    ["AI decision layer (TZ-5)", html.includes("function buildAIDecision") && html.includes("function buildCanonicalDecisionState")],
    ["TZ1 drive voice AI advice v16", html.includes("function getAIAdviceText") && html.includes("function speakCurrentDecision") && html.includes("function buildRerouteVoiceText")],
    ["TZ1 drive live GPS tracking v22 (handleLiveDrivePosition)", html.includes("function handleLiveDrivePosition") && html.includes("function startLiveDriveTracking") && html.includes("function evaluateReroute")],
    ["route cards UI cleanup (TZ-9 cards)", html.includes("function tz8RenderAlternativeCard") && html.includes("ROUTE CARDS UI CLEANUP")],
    ["renderResults decision UI", html.includes("function renderResults") && html.includes("DECISION UI BINDING")],
    ["route compare modal UI (openRouteDetails)", html.includes("function openRouteDetails") && html.includes("function tz10RouteDetailsViewModel")],
    ["drive start-nav entry", html.includes("function handleStartNavTap") && html.includes("function startDrive")],
    ["TZ6 production safety", html.includes("clearRoadTZ6Safety")],
    ["TZ2 GPS stability", html.includes("clearRoadTZ2Gps")],
    ["TZ7 live recalculation", html.includes("clearRoadTZ7LiveRecalculation")],
    ["TZ3 predictive stability", html.includes("clearRoadTZ3Predictive")],
    ["TZ4 UAE local / Salik", html.includes("clearRoadTZ4UAE")],
    ["TZ5 filters / preferences", html.includes("clearRoadTZ5Filters")],
    ["TZ6 Quick Start", html.includes("clearRoadTZ6QuickStart")],
    ["TZ7 main i18n (filters/Quick Start)", html.includes("clearRoadTZ7I18n")],
    ["tz8 RTL", html.includes("clearRoadTZ8RTL")],
    ["UX self-check", html.includes("__clearRoadRunUxSelfCheck")],
    ["tz9 voice", html.includes("clearRoadTZ9VoiceInput")],
    ["TZ10 AI assistant", html.includes("tz10BuildAIAssistantText")],
    ["TZ11 cleanup", html.includes("clearRoadTZ11")],
    ["TZ12 audit", html.includes("clearRoadTZ12")],
    ["TZ13 language engine", html.includes("clearRoadLanguageEngine")],
    ["TZ1 ElevenLabs TTS", html.includes("clearRoadTZ1TTS")],
    ["TZ2 route integrity", html.includes("tz2RouteDataIntegrity")],
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
  if (html.includes(PLACEHOLDER_TZ1_DIRECTIONS_ROUTE_EXTRACT_JS)) {
    if (!existsSync(tz1DirectionsRouteExtractJsFile) || !readFileSync(tz1DirectionsRouteExtractJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 directions route extract — нужен непустой", tz1DirectionsRouteExtractJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_ROUTE_METRICS_TRAFFIC_JS)) {
    if (!existsSync(tz1RouteMetricsTrafficJsFile) || !readFileSync(tz1RouteMetricsTrafficJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 route metrics/traffic — нужен непустой", tz1RouteMetricsTrafficJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_ROUTE_ROLE_SEGMENTS_JS)) {
    if (!existsSync(tz1RouteRoleSegmentsJsFile) || !readFileSync(tz1RouteRoleSegmentsJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 route role/segments — нужен непустой", tz1RouteRoleSegmentsJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_GPS_WARNINGS_JS)) {
    if (!existsSync(tz1DriveGpsWarningsJsFile) || !readFileSync(tz1DriveGpsWarningsJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 drive/GPS/warnings — нужен непустой", tz1DriveGpsWarningsJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_VOICE_TIMED_WARNINGS_JS)) {
    if (!existsSync(tz1DriveVoiceTimedWarningsJsFile) || !readFileSync(tz1DriveVoiceTimedWarningsJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 drive voice/timed warnings — нужен непустой", tz1DriveVoiceTimedWarningsJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_LANE_TIMED_HUD_JS)) {
    if (!existsSync(tz1DriveLaneTimedHudJsFile) || !readFileSync(tz1DriveLaneTimedHudJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 drive lane/timed HUD — нужен непустой", tz1DriveLaneTimedHudJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_UPCOMING_CONDITION_JS)) {
    if (!existsSync(tz1DriveUpcomingConditionJsFile) || !readFileSync(tz1DriveUpcomingConditionJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 drive upcoming condition — нужен непустой", tz1DriveUpcomingConditionJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_MAIN_INSTRUCTION_JS)) {
    if (!existsSync(tz1DriveMainInstructionJsFile) || !readFileSync(tz1DriveMainInstructionJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 drive main instruction — нужен непустой", tz1DriveMainInstructionJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_VOICE_NAV_TURNS_JS)) {
    if (!existsSync(tz1DriveVoiceNavTurnsJsFile) || !readFileSync(tz1DriveVoiceNavTurnsJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 drive voice nav turns — нужен непустой", tz1DriveVoiceNavTurnsJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ2_NORMALIZATION_LAYER_JS)) {
    if (!existsSync(tz2NormalizationLayerJsFile) || !readFileSync(tz2NormalizationLayerJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ2 normalization layer — нужен непустой", tz2NormalizationLayerJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_TZ2_DECISION_HELPERS_JS)) {
    if (!existsSync(tz1Tz2DecisionHelpersJsFile) || !readFileSync(tz1Tz2DecisionHelpersJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1+TZ2 decision helpers — нужен непустой", tz1Tz2DecisionHelpersJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_UPDATE_UI_JS)) {
    if (!existsSync(tz1DriveUpdateUiJsFile) || !readFileSync(tz1DriveUpdateUiJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 drive update UI — нужен непустой", tz1DriveUpdateUiJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ3_SCORE_ENGINE_JS)) {
    if (!existsSync(tz3ScoreEngineJsFile) || !readFileSync(tz3ScoreEngineJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ3 score engine — нужен непустой", tz3ScoreEngineJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ4_WHY_GENERATOR_JS)) {
    if (!existsSync(tz4WhyGeneratorJsFile) || !readFileSync(tz4WhyGeneratorJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ4 WHY generator — нужен непустой", tz4WhyGeneratorJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_AI_DECISION_LAYER_JS)) {
    if (!existsSync(aiDecisionLayerJsFile) || !readFileSync(aiDecisionLayerJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер AI decision layer — нужен непустой", aiDecisionLayerJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_VOICE_AI_ADVICE_JS)) {
    if (!existsSync(tz1DriveVoiceAiAdviceJsFile) || !readFileSync(tz1DriveVoiceAiAdviceJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 drive voice AI advice — нужен непустой", tz1DriveVoiceAiAdviceJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_CR_REROUTE_DECISION_JS)) {
    if (!existsSync(crRerouteDecisionJsFile) || !readFileSync(crRerouteDecisionJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер cr-reroute-decision — нужен непустой", crRerouteDecisionJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_DRIVE_LIVE_GPS_TRACKING_JS)) {
    if (!existsSync(tz1DriveLiveGpsTrackingJsFile) || !readFileSync(tz1DriveLiveGpsTrackingJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 drive live GPS tracking — нужен непустой", tz1DriveLiveGpsTrackingJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_CR_DRIVE_BINDING_JS)) {
    if (!existsSync(crDriveBindingJsFile) || !readFileSync(crDriveBindingJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер cr-drive-binding — нужен непустой", crDriveBindingJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_ROUTE_CARDS_UI_CLEANUP_JS)) {
    if (!existsSync(routeCardsUiCleanupJsFile) || !readFileSync(routeCardsUiCleanupJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер route-cards UI cleanup — нужен непустой", routeCardsUiCleanupJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_RENDER_RESULTS_DECISION_UI_JS)) {
    if (!existsSync(renderResultsDecisionUiJsFile) || !readFileSync(renderResultsDecisionUiJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер render-results decision UI — нужен непустой", renderResultsDecisionUiJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_ROUTE_COMPARE_MODAL_UI_JS)) {
    if (!existsSync(routeCompareModalUiJsFile) || !readFileSync(routeCompareModalUiJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер route-compare modal UI — нужен непустой", routeCompareModalUiJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_CR_PREDICTIVE_LAYER_JS)) {
    if (!existsSync(crPredictiveLayerJsFile) || !readFileSync(crPredictiveLayerJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер cr-predictive-layer — нужен непустой", crPredictiveLayerJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_CR_ROUTING_CORE_JS)) {
    if (!existsSync(crRoutingCoreJsFile) || !readFileSync(crRoutingCoreJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер cr-routing-core — нужен непустой", crRoutingCoreJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_CR_AUTOCOMPLETE_GEO_JS)) {
    if (!existsSync(crAutocompleteGeoJsFile) || !readFileSync(crAutocompleteGeoJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер cr-autocomplete-geo — нужен непустой", crAutocompleteGeoJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_DRIVE_START_NAV_JS)) {
    if (!existsSync(driveStartNavJsFile) || !readFileSync(driveStartNavJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер drive start-nav entry — нужен непустой", driveStartNavJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ6_PRODUCTION_SAFETY_JS)) {
    if (!existsSync(tz6ProductionSafetyJsFile) || !readFileSync(tz6ProductionSafetyJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ6 production safety — нужен непустой", tz6ProductionSafetyJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ2_GPS_STABILITY_JS)) {
    if (!existsSync(tz2GpsStabilityJsFile) || !readFileSync(tz2GpsStabilityJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ2 GPS stability — нужен непустой", tz2GpsStabilityJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ7_LIVE_RECALC_JS)) {
    if (!existsSync(tz7LiveRecalculationJsFile) || !readFileSync(tz7LiveRecalculationJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ7 live recalculation — нужен непустой", tz7LiveRecalculationJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ3_PREDICTIVE_STABILITY_JS)) {
    if (!existsSync(tz3PredictiveStabilityJsFile) || !readFileSync(tz3PredictiveStabilityJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ3 predictive stability — нужен непустой", tz3PredictiveStabilityJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ4_UAE_LOCAL_JS)) {
    if (!existsSync(tz4UaeLocalJsFile) || !readFileSync(tz4UaeLocalJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ4 UAE local — нужен непустой", tz4UaeLocalJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ5_FILTERS_JS)) {
    if (!existsSync(tz5FiltersJsFile) || !readFileSync(tz5FiltersJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ5 filters — нужен непустой", tz5FiltersJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ6_QUICK_START_JS)) {
    if (!existsSync(tz6QuickStartJsFile) || !readFileSync(tz6QuickStartJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ6 Quick Start — нужен непустой", tz6QuickStartJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ7_MAIN_I18N_JS)) {
    if (!existsSync(tz7MainI18nJsFile) || !readFileSync(tz7MainI18nJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ7 main i18n — нужен непустой", tz7MainI18nJsFile);
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
  if (html.includes(PLACEHOLDER_TZ10_AI_ASSISTANT_JS)) {
    if (!existsSync(tz10AiAssistantJsFile) || !readFileSync(tz10AiAssistantJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ10 — нужен непустой", tz10AiAssistantJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ11_CLEANUP_JS)) {
    if (!existsSync(tz11CleanupJsFile) || !readFileSync(tz11CleanupJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ11 — нужен непустой", tz11CleanupJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ12_FINAL_AUDIT_JS)) {
    if (!existsSync(tz12FinalAuditJsFile) || !readFileSync(tz12FinalAuditJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ12 — нужен непустой", tz12FinalAuditJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ13_PREMIUM_VOICE_JS)) {
    if (!existsSync(tz13PremiumVoiceJsFile) || !readFileSync(tz13PremiumVoiceJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ13 — нужен непустой", tz13PremiumVoiceJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ1_TTS_ELEVENLABS_JS)) {
    if (!existsSync(tz1ElevenlabsTtsJsFile) || !readFileSync(tz1ElevenlabsTtsJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ1 TTS — нужен непустой", tz1ElevenlabsTtsJsFile);
      process.exit(1);
    }
  }
  if (html.includes(PLACEHOLDER_TZ2_ROUTE_INTEGRITY_JS)) {
    if (!existsSync(tz2RouteIntegrityJsFile) || !readFileSync(tz2RouteIntegrityJsFile, "utf8").trim()) {
      console.error("input содержит плейсхолдер TZ2 route integrity — нужен непустой", tz2RouteIntegrityJsFile);
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
        injectTz2RouteIntegrityJs(
          injectTz1ElevenlabsTtsJs(
            injectTz13PremiumVoiceJs(
              injectTz12FinalAuditJs(
                injectTz11CleanupJs(
                    injectTz10AiAssistantJs(
                    injectEmptyStateJs(
                      injectTz1DirectionsRouteExtractJs(
                      injectTz1RouteMetricsTrafficJs(
                      injectTz1RouteRoleSegmentsJs(
                      injectTz1DriveGpsWarningsJs(
                      injectTz1DriveVoiceTimedWarningsJs(
                      injectTz1DriveLaneTimedHudJs(
                      injectTz1DriveUpcomingConditionJs(
                      injectTz1DriveMainInstructionJs(
                      injectTz1DriveVoiceNavTurnsJs(
                      injectTz2NormalizationLayerJs(
                      injectTz1Tz2DecisionHelpersJs(
                      injectTz1DriveUpdateUiJs(
                      injectTz3ScoreEngineJs(
                      injectTz4WhyGeneratorJs(
                      injectAiDecisionLayerJs(
                      injectTz1DriveVoiceAiAdviceJs(
                      injectCrRerouteDecisionJs(
                      injectTz1DriveLiveGpsTrackingJs(
                      injectCrDriveBindingJs(
                        injectRouteCardsUiCleanupJs(
                          injectRenderResultsDecisionUiJs(
                            injectRouteCompareModalUiJs(
                            injectCrPredictiveLayerJs(
                            injectCrRoutingCoreJs(
                            injectCrAutocompleteGeoJs(
                              injectDriveStartNavJs(
                              injectTz6ProductionSafetyJs(
                              injectTz2GpsStabilityJs(
                                injectTz7LiveRecalculationJs(
                                  injectTz3PredictiveStabilityJs(
                                    injectTz4UaeLocalJs(
                                      injectTz5FiltersJs(
                                        injectTz6QuickStartJs(
                                          injectTz7MainI18nJs(
                                            injectTz8RtlJs(
                                              injectTz7Tz8BundleJs(
                                                injectTz6bFinalJs(
                                                  injectTz6AiCleanJs(
                                                    injectTz4MobileJs(
                                                      injectTz3I18nCleanJs(
                                                        injectTz1Tz2FinalJs(
                                                          injectUxDiagBootstrapJs(injectI18n(injectCss(html)))
                                                        )
                                                      )
                                                    )
                                                  )
                                                )
                                              )
                                            )
                                          )
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                              )
                              )
                              )
                            )
                          )
                        )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
                      )
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
  console.log("   TZ1 directions route extract JS:", tz1DirectionsRouteExtractJsFile);
  console.log("   TZ1 route metrics/traffic JS:", tz1RouteMetricsTrafficJsFile);
  console.log("   TZ1 route role/segments JS:", tz1RouteRoleSegmentsJsFile);
  console.log("   TZ1 drive/GPS/warnings JS:", tz1DriveGpsWarningsJsFile);
  console.log("   TZ2 normalization layer JS:", tz2NormalizationLayerJsFile);
  console.log("   TZ1+TZ2 decision helpers JS:", tz1Tz2DecisionHelpersJsFile);
  console.log("   TZ3 score engine JS:", tz3ScoreEngineJsFile);
  console.log("   TZ4 WHY generator JS:", tz4WhyGeneratorJsFile);
  console.log("   AI decision layer JS:", aiDecisionLayerJsFile);
  console.log("   route cards UI cleanup JS:", routeCardsUiCleanupJsFile);
  console.log("   render-results decision UI JS:", renderResultsDecisionUiJsFile);
  console.log("   route compare modal UI JS:", routeCompareModalUiJsFile);
  console.log("   drive start-nav entry JS:", driveStartNavJsFile);
  console.log("   TZ6 production safety JS:", tz6ProductionSafetyJsFile);
  console.log("   TZ2 GPS stability JS:", tz2GpsStabilityJsFile);
  console.log("   TZ7 live recalculation JS:", tz7LiveRecalculationJsFile);
  console.log("   TZ3 predictive stability JS:", tz3PredictiveStabilityJsFile);
  console.log("   TZ4 UAE local JS:", tz4UaeLocalJsFile);
  console.log("   TZ5 filters JS:", tz5FiltersJsFile);
  console.log("   TZ6 Quick Start JS:", tz6QuickStartJsFile);
  console.log("   TZ7 main i18n JS:", tz7MainI18nJsFile);
  console.log("   TZ8 RTL JS:", tz8RtlJsFile);
  console.log("   UX self-check JS:", uxSelfCheckJsFile);
  console.log("   TZ9 voice JS:", tz9VoiceJsFile);
  console.log("   TZ10 AI assistant JS:", tz10AiAssistantJsFile);
  console.log("   TZ11 cleanup JS:", tz11CleanupJsFile);
  console.log("   TZ12 final audit JS:", tz12FinalAuditJsFile);
  console.log("   TZ13 premium voice JS:", tz13PremiumVoiceJsFile);
  console.log("   TZ1 ElevenLabs TTS JS:", tz1ElevenlabsTtsJsFile);
  console.log("   TZ2 route integrity JS:", tz2RouteIntegrityJsFile);
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
