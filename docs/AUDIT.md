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

## 4. Сопровождение

- Сборка варианта A: `clear-road-uae` → `npm run build` → `dist/index.html` + копия в `Downloads\index.html`.
- Источник логики: **`input/index.html`** (плейсхолдеры CSS, i18n, **TZ8 RTL**, **cr-empty-state**, **ключ Maps**) + `src/styles/*.css` + `src/i18n/*.js` + `src/js/*.js`. Ключ при сборке: env или `src/secrets/maps-api-key.txt` (не в git). Для CI/прод: **`npm run build:prod`** (без ключа сборка падает).

---

## Поэтапное лечение (план)

| Фаза | Цель | Действие |
|------|------|----------|
| **1** | Прозрачность + мелкая гигиена | Именованная константа задержек `installAll`, комментарий «зачем 5 таймеров»; этот документ. |
| **2** | Один источник правды по обёрткам | Расширен `__CLEAR_ROAD_ROUTE_CANON__` (setLang chain, третий слой initMap). Добавлен `window.__CLEAR_ROAD_WRAPPER_SNAPSHOT__()` для отладки. `__CLEAR_ROAD_ROUTE_PIPELINE_README__` → phase 2. Снятие самих обёрток — только фаза 3+. |
| **3** | Срез IIFE/дубли | **Сделано:** блок `cr-fix-route-empty-state-final-v2` вынесен в `src/js/cr-route-empty-state-final-v2.js`, в `input` — плейсхолдер `__CLEAR_ROAD_BUILD_JS_EMPTY_STATE_V2__`, сборка встраивает как раньше. Дальше по желанию: другие `<script id="…">` слои. |
| **4** | Ключ и деплой | **Сделано:** в `input` плейсхолдер `__CLEAR_ROAD_BUILD_MAPS_API_KEY__`. Сборка: `CLEAR_ROAD_MAPS_API_KEY` или `GOOGLE_MAPS_API_KEY` → иначе первая строка `src/secrets/maps-api-key.txt` (файл в `.gitignore`) → иначе dev fallback + предупреждение. В Cloud Console — ограничения по referrer для ключа. |
| **5** | Ещё вынос + прод-сборка | **Сделано:** слой `tz8-rtl-script` → `src/js/tz8-rtl-layer.js`, плейсхолдер `__CLEAR_ROAD_BUILD_JS_TZ8_RTL__`. Флаг **`--require-maps-key`**, скрипт **`npm run build:prod`** — без env/файла ключа сборка не проходит. **`npm run extract:tz8-rtl`** — вытягивание из монолита при откате шаблона. |

**Фаза 5:** TZ8 RTL в `src/js`; продакшен-сборка без «тихого» dev-ключа.
