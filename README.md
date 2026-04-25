# Keel — IVR Opportunity Report

A single-page sales dashboard that analyses a brand's IVR phone tree, projects
the friction reduction Keel's voice agent would deliver, and quantifies the
brand-reputation upside.

Live: https://salonipatadia12.github.io/keel-dashboard/

## What's on the page

- **Top bar** with brand, breadcrumb, and live-sync state
- **Hero score** — friction transformation rings (today vs with Keel)
- **Friction breakdown + system characteristics** — per-component bars and
  caller-experience flags (operator zero, voicemail, avg options/menu)
- **Metric cards** — menu levels, web redirects, phone transfers, brand
  reputation index, each as a current-vs-recommended delta
- **IVR call-flow trees**, top-to-bottom, with `#` repeat-menu nodes shown
  - **Today** (baseline) — the actual call flow with ghost branches pruned
  - **With Keel** (projected) — recommended redesign that lands friction in [10, 15]
- **Brand impact** — current vs projected reputation cards
- **The pitch** — bold callout summarising the opportunity

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS (custom dark palette)
- `@xyflow/react` + `dagre` for the tree visualisation
- `xlsx` for the build-time data import

## Develop

```bash
npm install
npm run dev
```

The pre-dev script reads `IVR2.0.xlsx` (in this repo or the parent folder),
parses each sheet, and writes `src/data.json`. The committed `data.json` is
the source of truth for production builds.

## Deploy

Pushed to `main` → GitHub Actions builds with `BASE_PATH=/keel-dashboard/`
and publishes to GitHub Pages. The workflow lives in
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
