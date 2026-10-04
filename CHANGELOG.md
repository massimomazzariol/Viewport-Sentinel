# Changelog

All notable changes to Viewport Sentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-04

### Changed

- Mobile menu check: opens the menu and verifies that every item is on screen and not clipped or covered. It catches the classic case of a fixed menu clipped by an ancestor with transform, filter or backdrop-filter.
- Exit code 1 when blocker or high issues are found (or a device fails), 2 for configuration errors: usable as a CI gate.
- One browser per engine instead of one launch per device; iPhone 12 dropped (same size class as iPhone 15 Pro).
- Devices and menu toggle selectors live in JSON files.
- file:// URLs accepted.
- No more dotenv and minimist: Node's util.parseArgs and process.loadEnvFile (Node 20.12 or later).

### Added

- examples/broken.html and examples/fixed.html, used by the test suite and CI.

## [0.1.0] - 2026-04-29

### Added

- Initial release of Viewport Sentinel
- Core detectors: horizontal overflow, visual edge leak, shadow clipping, mobile menu
- 10 device configurations: desktop (Chromium, Firefox, WebKit), mobile (iPhone SE/12/15 Pro, Pixel, Samsung), tablet (iPad portrait/landscape)
- CLI interface with `--url`, `--strict`, `--debug`, `--headed`, `--out` flags
- Markdown and JSON report generation
- Debug mode with CSS outline injection
- Strict mode with tighter detection thresholds
- npm scripts: `scan`, `scan:strict`, `scan:debug`, `scan:full`, `clean`
- `.env` support via dotenv
