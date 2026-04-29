# Viewport Sentinel

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/package%20manager-pnpm-F69220.svg)](https://pnpm.io/)
[![Playwright](https://img.shields.io/badge/powered%20by-Playwright-2EAD33.svg)](https://playwright.dev/)

**Detect responsive layout bugs before your users do.**

Viewport Sentinel is a Playwright-based CLI tool that scans any website across real browser viewports and reports layout defects — horizontal overflow, visual edge leaks, shadow clipping, and mobile menu anomalies — with specific, actionable diagnostics.

It is **not** a visual regression tool. It does not compare screenshots. It explains **why** your layout breaks.

---

## Why Viewport Sentinel?

Most visual QA tools tell you that *something changed*.

Viewport Sentinel focuses on structural layout problems:

- Which element escaped the viewport?
- By how many pixels?
- Which device/browser profile exposed it?
- Is the issue a confirmed overflow or a heuristic warning?
- Which CSS properties are suspicious?
- Where should you look first to fix it?

That makes it useful when a real user says things like:

> “There is a white strip on the right side on mobile.”

Instead of only showing a screenshot, Viewport Sentinel tries to point to the likely cause.

---

## Features

- **Hard detection** — DOM measurement via `scrollWidth`, `clientWidth`, `getBoundingClientRect`, and forced scroll to confirm real overflow
- **Visual detection** — pixel-level brightness sampling to catch right-edge white-strip leaks that DOM checks can miss
- **Heuristic detection** — CSS pattern analysis such as shadow clipping inside overflow-constrained ancestors
- **10 browser/device profiles** — Chromium, Firefox, WebKit desktops; iPhone SE/12/15 Pro, Pixel, Samsung-like mobiles; iPad portrait/landscape tablets
- **Structured reports** — Markdown + JSON, grouped by severity, with suspected cause and fix suggestion per issue
- **Strict mode** — tighter thresholds for aggressive QA checks
- **Debug mode** — injects temporary CSS outlines and captures extra screenshots for visual debugging
- **Cross-platform usage** — works through direct CLI commands, `.env`, or package scripts
- **No silent fallback URL** — if no URL is provided, the tool exits clearly instead of scanning the wrong site

---

## Installation

```bash
git clone https://github.com/massimomazzariol/Viewport-Sentinel.git
cd Viewport-Sentinel
pnpm install
pnpm exec playwright install
```

> Node.js 18+ is required.

---

## Quick Start

The most reliable cross-platform command is the direct CLI:

```bash
node src/cli.js --url https://example.com --strict --debug
```

This works the same on macOS, Linux, and Windows PowerShell.

---

## Usage

### Direct CLI

```bash
node src/cli.js --url https://example.com [options]
```

| Flag | Alias | Description |
|------|-------|-------------|
| `--url` | `-u` | Target URL. Overrides `SITE_URL`. |
| `--strict` | `-s` | Strict mode with tighter thresholds. |
| `--debug` | `-d` | Debug mode with temporary CSS outlines and extra screenshots. |
| `--headed` | | Run browsers visibly instead of headless. |
| `--out` | | Output directory. Default: `test-results`. |
| `--help` | `-h` | Show CLI help. |

Examples:

```bash
node src/cli.js --url https://example.com
node src/cli.js --url https://example.com --strict
node src/cli.js --url https://example.com --debug
node src/cli.js --url https://example.com --strict --debug
node src/cli.js --url https://example.com --headed --out ./reports
```

---

## Usage via pnpm Scripts

### macOS / Linux

```bash
# Standard scan
SITE_URL=https://example.com pnpm run scan

# Strict mode
SITE_URL=https://example.com pnpm run scan:strict

# Debug mode
SITE_URL=https://example.com pnpm run scan:debug

# Full scan: strict + debug
SITE_URL=https://example.com pnpm run scan:full
```

### Windows PowerShell

```powershell
# Standard scan
$env:SITE_URL="https://example.com"
pnpm run scan

# Strict mode
$env:SITE_URL="https://example.com"
pnpm run scan:strict

# Debug mode
$env:SITE_URL="https://example.com"
pnpm run scan:debug

# Full scan: strict + debug
$env:SITE_URL="https://example.com"
pnpm run scan:full
```

### Clean output directories

```bash
pnpm run clean
```

---

## Usage via `.env`

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then set your target URL:

```env
SITE_URL=https://example.com
STRICT=false
DEBUG_MODE=false
```

Run:

```bash
pnpm run scan
```

---

## Missing URL Behavior

Viewport Sentinel does **not** use a random fallback URL.

If no URL is provided, it exits with a clear error:

```text
Viewport Sentinel — ERROR: No URL provided.

  Set the SITE_URL environment variable or use the --url flag:

    SITE_URL=https://example.com pnpm run scan
    node src/cli.js --url https://example.com
```

This prevents accidentally scanning the wrong website and trusting meaningless results.

---

## Output

Reports are written to `test-results/` after each scan:

```text
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

`test-results/` is intentionally ignored by Git, except for placeholder `.gitkeep` files.

---

## Detection Model

Viewport Sentinel groups findings by severity and confidence.

| Severity | Meaning |
|----------|---------|
| `blocker` | Confirmed layout break, such as horizontal overflow detected by DOM measurement or force-scroll confirmation. |
| `high` | Element outside viewport or strong visual edge anomaly. |
| `medium` | Likely visible issue, such as shadow clipping or menu overlay anomaly. |
| `low` | Suspicious pattern that should be reviewed. |
| `pass` | Check ran and found nothing actionable. |
| `info` | Check skipped or not applicable for the current page/device. |

---

## Detectors

| Detector | Type | Detects |
|----------|------|---------|
| `overflow` | Hard | `scrollWidth > clientWidth`, force-scroll confirmation, elements past viewport right edge |
| `edge-leak` | Visual | Bright pixel strip on the rightmost edge vs a reference strip inward |
| `shadow-clipping` | Heuristic | `box-shadow` / `drop-shadow` inside overflow-constrained ancestors |
| `mobile-menu` | Hard / heuristic | Menu overlay width, right gap, overflow after toggle click |

### `overflow`

Checks whether the page is wider than the viewport and identifies likely offending elements.

It looks at:

- document `scrollWidth`
- document `clientWidth`
- forced horizontal scrolling
- element bounding boxes
- rightmost element position
- computed layout styles

Typical issues:

- `width: 100vw` inside constrained layouts
- negative margins
- absolute positioning without bounds
- third-party embeds forcing a minimum width
- elements translated past the viewport

### `edge-leak`

Samples pixels on the right edge of the screenshot and compares them with an inner reference strip.

This can flag cases where the DOM looks fine, but the rendered page shows a visible bright strip or background leak.

### `shadow-clipping`

Looks for card-like elements with shadows inside ancestors using `overflow: hidden`, `overflow: clip`, or similar clipping behavior.

This is heuristic by design. It should be treated as “visual review needed”, not guaranteed failure.

### `mobile-menu`

Attempts to detect and open common mobile navigation patterns, then measures whether the opened menu overlay aligns with the viewport.

If no suitable menu is found, the detector should report the check as not applicable rather than failing the scan.

---

## Example Report Output

> The following is fake example data to illustrate the report format.

```text
# Viewport Sentinel — Scan Report

| Field             | Value                    |
|-------------------|--------------------------|
| URL               | https://example.com      |
| Timestamp         | 2026-04-29T14:32:01.000Z |
| Mode              | strict + debug           |
| Devices tested    | 10                       |
| Actionable issues | 3                        |

## Severity Summary

| Severity  | Count |
|-----------|------:|
| [BLOCKER] |     1 |
| [HIGH]    |     1 |
| [MEDIUM]  |     1 |

## Issues

### iPhone SE (375x667)

#### [BLOCKER] Horizontal scroll detected

Detection method: hard
Confidence: high

Document scrollWidth (391px) exceeds viewport width (375px) by 16px.
Confirmed: page physically scrolls horizontally.

Suspected cause:
An element or its margin/padding extends beyond the right edge.

Suggested fix:
Inspect elements near the right edge. Common causes include negative margins,
absolute positioning without bounds, 100vw with scrollbar offsets, and embeds
with fixed minimum widths.

---

#### [HIGH] Visual right-edge leak detected

Detection method: visual
Confidence: medium

The right-edge pixel strip is 74 brightness units lighter than the reference
strip 40px inward. This suggests a visible gap on the right edge.

Suspected cause:
A section background may not extend to the full intended width.

Suggested fix:
Ensure the section background and its clipping/overflow rules cover the full
visible area.

---

#### [MEDIUM] Possible shadow clipping on .card

Detection method: heuristic
Confidence: low

A card-like element has a box-shadow but is inside an overflow-constrained
parent. The parent has a distinct background colour, increasing the likelihood
that clipping is visible.

Suspected cause:
The parent may be cropping the shadow region.

Suggested fix:
Add safe internal spacing, move the shadow to an unclipped wrapper, or remove
the clipping rule if it is not required for layout.
```

---

## Common Bugs It Helps Identify

- Hero sections set to `100vw` causing scrollbar-related overflow
- Absolutely positioned elements escaping their container
- Third-party embeds or iframes forcing a minimum width on mobile
- Mobile menu overlays with width, transform, or containment issues
- Card shadows clipped by overflow-constrained parents
- Legacy grid gutters or negative margins on narrow viewports
- Full-width sections whose background does not cover the visible page width

---

## Debug Mode

Debug mode injects temporary CSS outlines before taking extra screenshots.

```bash
node src/cli.js --url https://example.com --debug
```

It is useful when the report says an element is escaping the viewport but you want a quick visual map of the layout boxes.

The debug CSS is temporary and is not written to the target website.

---

## Strict Mode

Strict mode lowers detection thresholds and reports more suspicious cases.

```bash
node src/cli.js --url https://example.com --strict
```

Use strict mode when:

- you are auditing a site before delivery
- you want false positives rather than missed bugs
- you are checking a fragile responsive layout
- you are preparing QA screenshots for review

---

## Recommended Workflow

1. Run a normal scan.
2. If no blocker/high issues appear, run strict mode.
3. If something looks suspicious, run debug mode.
4. Inspect `test-results/report.md`.
5. Open the relevant screenshots.
6. Fix one issue at a time.
7. Re-run the scan after each fix.

Example:

```bash
node src/cli.js --url https://example.com
node src/cli.js --url https://example.com --strict
node src/cli.js --url https://example.com --strict --debug
```

---

## Limitations

- **Not a visual regression tool.** It does not compare before/after screenshots.
- **Heuristic detectors are not deterministic.** Shadow clipping reports are best-effort and may produce false positives. Confidence is marked explicitly.
- **Visual edge-leak detection depends on page contrast.** Dark-background sites with dark right edges may not trigger the brightness delta threshold even if a real gap exists.
- **Mobile menu detection uses generic selectors.** Highly custom navigation patterns may not be detected.
- **Single URL per run.** Multi-page crawling is not yet supported.
- **JavaScript-rendered content requires page loading to complete.** Pages with very long loading times may time out.
- **Cross-origin iframe internals cannot be inspected.** Viewport Sentinel can detect the iframe box itself overflowing, but it cannot inspect the iframe’s internal DOM.
- **Real-device bugs can still exist.** Browser emulation and Playwright WebKit are useful, but they are not a perfect substitute for physical iOS/Android device testing.

---

## Roadmap

- [ ] Multi-page crawl mode (sitemap / URL list)
- [ ] CI/CD exit code based on severity threshold
- [ ] HTML report with embedded screenshots
- [ ] Custom detector plugins
- [ ] Diff mode: compare two URLs or two scan runs
- [ ] Baseline comparison between scans
- [ ] Safari-specific overflow fallback checks
- [ ] GitHub Actions integration example
- [ ] npm package publishing
- [ ] Better mobile menu detector configuration
- [ ] Optional config file for custom device sets and thresholds

---

## Contributing

This project is still early. Issues, ideas, and pull requests are welcome.

Good first contributions could include:

- new detector ideas
- better device presets
- clearer report formatting
- CI examples
- documentation improvements
- real-world test cases

---

## License

MIT — see [LICENSE](LICENSE).
