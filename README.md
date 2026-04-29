# Viewport Sentinel

**Detect responsive layout bugs before your users do.**

Viewport Sentinel is a Playwright-based CLI tool that scans any website across real browser viewports and reports layout defects — horizontal overflow, visual edge leaks, shadow clipping, and mobile menu anomalies — with specific, actionable diagnostics.

It is **not** a visual regression tool. It does not compare screenshots. It explains **why** your layout breaks.

---

## Features

- **Hard detection** — DOM measurement via `scrollWidth`, `getBoundingClientRect`, and forced scroll to confirm real overflow
- **Visual detection** — pixel-level brightness sampling to catch white-strip edge leaks that DOM checks miss
- **Heuristic detection** — CSS pattern analysis (shadow + clip ancestor, Safari overflow fallbacks)
- **10 real devices** — Chromium, Firefox, WebKit desktops; iPhone SE/12/15 Pro, Pixel, Samsung mobiles; iPad portrait/landscape tablets
- **Structured reports** — Markdown + JSON, grouped by severity, with suspected cause and fix suggestion per issue
- **Strict mode** — tighter thresholds for CI gates
- **Debug mode** — injects CSS outlines + captures extra screenshots for visual debugging
- **Zero config** — one env variable or CLI flag is all you need

---

## Installation

```bash
git clone https://github.com/your-org/viewport-sentinel.git
cd viewport-sentinel
npm install
npx playwright install
```

> Node.js 18+ is required.

---

## Usage

### Via npm scripts

```bash
# Standard scan
SITE_URL=https://example.com npm run scan

# Strict mode (lower thresholds, better for CI)
SITE_URL=https://example.com npm run scan:strict

# Debug mode (CSS outlines + extra screenshots)
SITE_URL=https://example.com npm run scan:debug

# Both strict and debug
SITE_URL=https://example.com npm run scan:full

# Clean output directories
npm run clean
```

### Via .env file

Copy `.env.example` to `.env` and fill in your URL:

```env
SITE_URL=https://example.com
STRICT=false
DEBUG_MODE=false
```

Then run:

```bash
npm run scan
```

---

## CLI Usage

```bash
node src/cli.js --url https://example.com [options]
```

| Flag | Alias | Description |
|------|-------|-------------|
| `--url` | `-u` | Target URL (overrides `SITE_URL`) |
| `--strict` | `-s` | Strict mode: tighter thresholds |
| `--debug` | `-d` | Debug mode: CSS outlines + extra screenshots |
| `--headed` | | Run browsers in visible (headed) mode |
| `--out` | | Output directory (default: `test-results`) |
| `--help` | `-h` | Show help |

**Examples:**

```bash
node src/cli.js --url https://example.com
node src/cli.js --url https://example.com --strict --debug
node src/cli.js --url https://example.com --headed --out ./reports
```

**Missing URL fails loudly — no silent fallback:**

```
Viewport Sentinel — ERROR: No URL provided.

  Set the SITE_URL environment variable or use the --url flag:

    SITE_URL=https://example.com npm run scan
    node src/cli.js --url https://example.com
```

---

## Output

Reports are written to `test-results/` after each scan:

```
test-results/
├─ report.md          ← Human-readable Markdown report
├─ report.json        ← Machine-readable JSON report
└─ screenshots/
   ├─ desktop-chromium-full.png
   ├─ iphone-se-full.png
   ├─ iphone-se-debug.png       ← Debug mode only
   ├─ menu-closed-iphone-se.png
   └─ menu-open-iphone-se.png
```

---

## Example Report Output

> The following is **fake example data** to illustrate the report format.

```
# Viewport Sentinel — Scan Report

| Field            | Value                        |
|------------------|------------------------------|
| URL              | https://example.com          |
| Timestamp        | 2026-04-29T14:32:01.000Z     |
| Mode             | strict + debug               |
| Devices tested   | 10                           |
| Actionable issues| 3                            |

## Severity Summary

| Severity  | Count |
|-----------|------:|
| [BLOCKER] |     1 |
| [HIGH]    |     1 |
| [MEDIUM]  |     1 |

## Issues

### iPhone SE (375x667)

#### [BLOCKER] Horizontal scroll detected

**Detection method:** hard | **Confidence:** high

Document scrollWidth (391px) exceeds viewport width (375px) by 16px.
Confirmed: page physically scrolls horizontally.

**Suspected cause:** An element or its margin/padding extends beyond the right edge.

**Suggested fix:** Inspect elements near the right edge. Common causes: negative
margins, absolute positioning without bounds, 100vw with scrollbar offsets.

---

#### [HIGH] Visual right-edge leak detected

**Detection method:** visual | **Confidence:** medium

The right-edge pixel strip is 74 brightness units lighter than the reference
strip 40px inward (threshold: 25). This suggests a white gap on the right edge.

**Suspected cause:** A section background does not extend to full viewport width.

**Suggested fix:** Ensure background colors cover 100vw on full-width sections.

---

#### [MEDIUM] Possible shadow clipping on .card (heuristic)

**Detection method:** heuristic | **Confidence:** low *(heuristic — not a guaranteed bug)*

<div> has a box-shadow (blur: 12px) but is inside an overflow:hidden parent (.card-list).
The parent has a distinct background colour, increasing likelihood that clipping is visible.

**Suspected cause:** overflow:hidden on parent is cropping the shadow region.

**Suggested fix:** Add padding equal to the shadow blur to .card-list, or remove
overflow:hidden if not required for layout.
```

---

## Detectors

| Detector | Type | Detects |
|----------|------|---------|
| `overflow` | Hard | `scrollWidth > clientWidth`, unclipped elements past viewport right edge |
| `edge-leak` | Visual | Bright pixel strip on rightmost 4px vs reference 40px inward |
| `shadow-clipping` | Heuristic | `box-shadow` / `drop-shadow` inside `overflow:hidden` ancestor |
| `mobile-menu` | Hard | Menu overlay width, gap, overflow after toggle click |

### Severity levels

| Level | Meaning |
|-------|---------|
| `blocker` | Confirmed layout break — overflow detected by DOM measurement |
| `high` | Element outside viewport or visual edge anomaly |
| `medium` | Shadow clipping or menu gap — likely visible |
| `low` | Suspicious pattern — review recommended |
| `pass` | Check ran and found nothing |
| `info` | Check skipped (not applicable for this device) |

---

## Why This Exists

Screenshot-comparison tools tell you that *something changed*. They do not tell you *what broke or why*. When a client reports a white strip on mobile, a screenshot diff shows a white strip. Viewport Sentinel tells you the element, the pixel count, the suspected cause, and where to look in your CSS.

Common bugs it finds:

- Hero sections set to `100vw` causing a scrollbar offset on Windows
- Absolutely positioned elements without `right: 0` or `overflow: hidden` containment
- Mobile menu overlays with `transform: translateX(-100%)` not accounting for subpixel rounding
- Card grid shadows clipped by a parent `overflow: hidden` needed for rounded corners
- Footer sections with `margin-right: -15px` legacy grid gutters on narrow viewports

---

## Limitations

- **Not a visual regression tool.** It does not compare before/after screenshots.
- **Heuristic detectors are not deterministic.** Shadow clipping reports are best-effort and may produce false positives. Confidence is marked explicitly.
- **Visual edge-leak detection depends on page contrast.** Dark-background sites with dark right edges may not trigger the brightness delta threshold even if a real gap exists.
- **Mobile menu detection uses generic selectors.** Highly custom navigation patterns may not be detected.
- **Single URL per run.** Multi-page crawling is not yet supported.
- **JavaScript-rendered content** requires `networkidle` to complete. Pages with very long loading times may time out.
- **Does not detect issues in iframes** embedded from other origins.

---

## Roadmap

- [ ] Multi-page crawl mode (sitemap / URL list)
- [ ] CI/CD exit code based on severity threshold
- [ ] HTML report with embedded screenshots
- [ ] Custom detector plugins
- [ ] Diff mode: compare two URLs or two scan runs
- [ ] Safari-specific overflow:clip fallback detection
- [ ] GitHub Actions integration example

---

## License

MIT — see [LICENSE](LICENSE).
