# Clear Road UAE — аудит монолита `index.html`

Артефакт: один HTML (~13.8k строк в собранном виде), инлайн CSS, блок i18n, длинный основной `<script>`, асинхронная подгрузка Maps.

## 1. Архитектура и «патчи»

| Риск | Что видно в коде |
|------|------------------|
| Наслоение обёрток | `window.calculateRoutes` переопределяется (ядро + `calculateRoutesUnified` / `__crEmptyStateFinalV2`). |
| `initMap` | Цепочка hook’ов (`initMapTZ2Final`, `hookInitMapForDirectionsTracker`, `hooked` и т.д.). |
| 'setLang' | Несколаько присваиваний `window.setLang` и wrapper’ов в разных участках. |
| Повторный запуск лечащего слоя | В конце cr-empty-state: `installAll` по таймерам `[0,120,450,1200,2800]` — борьба с поздней регистрацией core/Directions. |
| Метки TZ/cr-fix | Много зон `TZ*`, `cr-fix-*` — история эволюции, а не один модуль. |

**Вывод:** поведение зависит от **порядка** исполнения и повторных вызовов; рефакторинг без пошаговых проверок легко ломает маршрут/рендер.

## 2. Состояние маршрута и UI

- `data-route-state`: `IDLE` / `LOADING` / `READY` / `ERROR`.
- `renderResults()` с **self-heal**: при `IDLE`/`ERROR`, но есть валидные `analyzedRoutes` + `currentDecision.bestRoute`, состояние поднимается к `READY` — снижает гонки с пустым списком.

## 3. Безопасность

- **Ключ Google Maps** захардкожен в URL скрипта (нормально для клиента JS, но обязательны **ограничения ключа** в Google Cloud: HTTP referrer, API restrictions).
- Явных `eval` / `new Function` в файле не найдено (по поиску).

### 3.1 Учёт конфигурации API-ключа (изменения в Google Cloud не выполняются в рамках этого аудита)

Для интерпретации сбоев **Autocomplete / GPS / карта** нужно помнить: это не всегда ошибка в репозитории.

**HTTP referrers, разрешённые для тестового ключа (пример актуальной политики в Cloud):**

- `http://localhost:3000/*`
- `http://127.0.0.1:3000/*`
- `http://192.168.1.149:3000/*`
- `https://korotkovmykola11-cmd.github.io/*`

Запуск страницы с **другого origin** (другой порт, `file://`, другой хост LAN без referrer в списке, прод-домен без правила) даст отказы на стороне Google, даже при корректном коде.

**Включённые API (для сверки с ограничениями «API restrictions» на ключе):**

- Places API (New)
- Maps JavaScript API
- Directions API
- Geocoding API

**Типовые причины проблем *не* в коде при проверке autocomplete и GPS:**

1. **Ограничения ключа** — неверный или отсутствующий referrer, слишком узкий список API на ключе, другой ключ в сборке, чем настроенный в Cloud.
2. **Запуск не через разрешённый хост** — например не `localhost:3000` / не указанный IP, не GitHub Pages URL из списка.
3. **Кэш браузера** — старая версия `index.html`/сервис-воркер; жёсткое обновление или чистый профиль помогают отделить от багов ключа.
4. **Другое устройство в сети** — запрос идёт с origin, который **не совпадает** с разрешённым referrer (другой локальный IP, телефон по 4G без того же host и т.д.).

**Важно:** в рамках аудита репозитория **ничего не меняется в Google Cloud Console** — только учитывается эта конфигурация при выводах и чек-листах проверки.

### 3.2 Диагностика UX (консоль + полоска Places/GPS)

В приложении включён слой **только для прозрачности** (не меняет маршрут и AI):

- Префикс лога: **`[Clear Road UX]`** — Places готов / недоступен, включение локального fallback, успех/ошибка GPS, результат reverse geocode (строка + `reason`).
- При отклонении ключа Maps вызывается **`gm_authFailure`** → в консоль пишется причина (referrer / API / billing) и в полоске **Maps:FAIL**.
- Плашка **`#cr-ux-diag-strip`** (класс `cr-ux-diag-strip`): текст вида `Places:OK|FAIL|—  GPS:OK|FAIL|—` [опц. `Maps:FAIL`].
- После **`initMap`** автоматически вызывается **`__clearRoadRunUxSelfCheck({ source: 'afterInitMap' })`** — таблица в консоли; повтор вручную: `__clearRoadRunUxSelfCheck()`; при `?cr_selfcheck=1` — доп. запуск через ~2.5s после `load`.

## 4. Сопровождение

- Сборка варианта A: `clear-road-uae` → `npm run build` → `dist/index.html` + копия в `Downloads\index.html`.
- Источник логики: **`input/index.html`** (плейсхолдеры CSS, i18n, **TZ8 RTL**, **TZ9 voice**, **UX self-check**, **cr-empty-state**, **ключ Maps**) + `src/styles/*.css` + `src/i18n/*.js` + `src/js/*.js`. Ключ при сборке: env или `src/secrets/maps-api-key.txt` (не в git). Для CI/прод: **`npm run build:prod`** (без ключа сборка падает).

---

## Поэтапное лечение (план)

| Фаза | Цель | Действие |
|------|------|----------|
| **1** | Прозрачность + мелкая гигиена | **Сделано:** в `src/js/cr-route-empty-state-final-v2.js` константа `CR_EMPTY_STATE_INSTALL_RETRY_DELAYS_MS` + комментарий, зачем пять отложенных `installAll` (асинхронная цепочка core/Directions/initMap). Этот документ — часть фазы 1. |
| **2** | Один источник правды по обёрткам | **Сделано (2026-05-02):** `__CLEAR_ROAD_ROUTE_CANON__` (версия в коде), порядок `initMapLayers` снаружи→внутрь совпадает с комментарием; `__CLEAR_ROAD_WRAPPER_SNAPSHOT__()` расширен: `canonVersion`, `setLangChainModules` (TZ7/TZ8/TZ9), маркеры на `calculateRoutes`/`initMap`/`setLang`. Снятие самих обёрток — фаза 3+. |
| **3** | Срез IIFE/дубли | **Сделано:** блок `cr-fix-route-empty-state-final-v2` вынесен в `src/js/cr-route-empty-state-final-v2.js`, в `input` — плейсхолдер `__CLEAR_ROAD_BUILD_JS_EMPTY_STATE_V2__`, сборка встраивает как раньше. Дальше по желанию: другие `<script id="…">` слои. |
| **4** | Ключ и деплой | **Сделано:** в `input` плейсхолдер `__CLEAR_ROAD_BUILD_MAPS_API_KEY__`. Сборка: `CLEAR_ROAD_MAPS_API_KEY` или `GOOGLE_MAPS_API_KEY` → иначе первая строка `src/secrets/maps-api-key.txt` (файл в `.gitignore`) → иначе dev fallback + предупреждение. В Cloud Console — ограничения по referrer для ключа. |
| **5** | Ещё вынос + прод-сборка | **Сделано:** слой `tz8-rtl-script` → `src/js/tz8-rtl-layer.js`, плейсхолдер `__CLEAR_ROAD_BUILD_JS_TZ8_RTL__`. Флаг **`--require-maps-key`**, скрипт **`npm run build:prod`** — без env/файла ключа сборка не проходит. **`npm run extract:tz8-rtl`** — вытягивание из монолита при откате шаблона. |

**Фаза 5:** TZ8 RTL в `src/js`; продакшен-сборка без «тихого» dev-ключа.
