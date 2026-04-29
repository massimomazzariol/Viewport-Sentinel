# Changelog

All notable changes to Viewport Sentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-04-29

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
