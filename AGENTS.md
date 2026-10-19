# Cranium development

- This is a Telegram Mini App for an anatomical skull atlas, hosted statically on GitHub Pages, with a separate Python bot for bothost.ru.
- The user's explicit requirement is **a real 3D model with animations**. Keep the 22 independent BodyParts3D bones, left/right selection, isolated bone mode, orbit/zoom, animated assembly/disassembly and optional rotation. A flat SVG or screenshot cannot replace the main 3D workflow.
- Use the existing checkout. Do not create a worktree unless the user requests one.
- Preserve source provenance, FJ/FMA identifiers, asset checksums and licenses. Do not replace real source geometry with fabricated shapes, or assign medical structures arbitrary 3D coordinates.
- The catalogue includes 226 major bilingual structures. There are 92 transferred 3D landmark concepts at 114 side-specific points from Z-Anatomy and 54 markers on seven 2D OpenStax plates. `public/models/landmarks.json` records sources, registration residuals and explicitly unmapped IDs. Do not claim all 226 landmarks have verified 3D coordinates or confuse registration statistics with medical validation. The adapted landmark dataset is CC BY-SA 4.0, distinct from the geometry's CC BY 4.0 and the OpenStax images' CC BY-NC-SA 4.0.
- Read `docs/ANATOMY.md` before changing educational content; it distinguishes primary medical sources, editorial descriptions, nomenclature variants and validation limits.
- `npm run check` runs meaningful data/logic/bot checks and builds the app. `npm run test:e2e` exercises Chromium on desktop/mobile, including real WebGL rendering. Test the GitHub Pages subpath after changes to asset loading: `BASE_PATH=/starosta-bo/ npm run build` then `E2E_BASE_PATH=/starosta-bo/ npm run test:e2e`.
- Keep BOT_TOKEN out of browser code, VITE variables, commits and logs. The frontend uses no credentials. The bot reads BOT_TOKEN and MINI_APP_URL only from its server environment.
- No publication has been authorized merely by preparing code. Do not claim a live GitHub Pages or BotHost deployment without verifying it.
