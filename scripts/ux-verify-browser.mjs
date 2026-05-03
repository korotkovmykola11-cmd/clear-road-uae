/**
 * UX verification: http://localhost:3000 (Playwright).
 * Run: node scripts/ux-verify-browser.mjs
 */
import { chromium } from "playwright";

const URL = process.env.CLEAR_ROAD_UX_URL || "http://localhost:3000";

const consoleBuf = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    geolocation: { latitude: 25.4052, longitude: 55.5136 },
    permissions: ["geolocation"],
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    consoleBuf.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (err) => {
    consoleBuf.push({ type: "pageerror", text: err.message || String(err) });
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2000);

  try {
    await page.waitForFunction(() => window.__CLEAR_ROAD_MAP_READY__ === true, { timeout: 90000 });
  } catch {
    /* continue */
  }

  const baseline = await page.evaluate(() => ({
    mapReady: !!window.__CLEAR_ROAD_MAP_READY__,
    mapsAuthFailed: !!window.__CLEAR_ROAD_MAPS_AUTH_FAILED__,
    placesReady: window.__CLEAR_ROAD_PLACES_AUTOCOMPLETE_READY__ === true,
    diag: window.__CLEAR_ROAD_UX_DIAG__
      ? { places: window.__CLEAR_ROAD_UX_DIAG__.places, mapsAuth: window.__CLEAR_ROAD_UX_DIAG__.mapsAuth }
      : null
  }));

  await page.locator("#start").click();
  await page.locator("#start").fill("");
  await page.keyboard.type("Dubai Mall", { delay: 35 });
  await page.waitForTimeout(2800);
  let dubaiPac = await page.locator(".pac-container .pac-item").count();

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await page.locator("#end").click({ force: true });
  await page.locator("#end").fill("");
  await page.keyboard.type("Ajman", { delay: 35 });
  await page.waitForTimeout(2800);
  let ajmanPac = await page.locator(".pac-container .pac-item").count();

  const startBefore = await page.inputValue("#start");
  await page.locator("#gps-btn").click();
  await page.waitForTimeout(5000);
  const startAfterGps = await page.inputValue("#start");

  const selfCheck = await page.evaluate(() =>
    typeof window.__clearRoadRunUxSelfCheck === "function"
      ? window.__clearRoadRunUxSelfCheck({ source: "ux-verify-browser.mjs" })
      : null
  );

  const legacyPlacesErrors = consoleBuf.filter(
    (e) =>
      e.type === "error" &&
      (/legacy/i.test(e.text) || /LegacyApiNotActivated/i.test(e.text) || /places/i.test(e.text))
  );

  const gmAuthEvidence = consoleBuf.some(
    (e) =>
      /gm_authFailure|Google Maps JavaScript API error|ApiTargetBlockedMapError/i.test(e.text)
  );

  await browser.close();

  const out = {
    url: URL,
    map: baseline,
    autocomplete: { dubaiMallPacItems: dubaiPac, ajmanPacItems: ajmanPac },
    gps: { startBefore, startAfterGps, changed: startAfterGps.trim() !== startBefore.trim() },
    console: {
      gmAuthFailureEvidence: gmAuthEvidence,
      legacyOrPlacesErrors: legacyPlacesErrors.map((e) => e.text),
      pageErrors: consoleBuf.filter((e) => e.type === "pageerror").map((e) => e.text)
    },
    selfCheck
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
