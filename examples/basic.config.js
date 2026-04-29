// Viewport Sentinel — example configuration
//
// This file documents available options.
// Runtime configuration is set via CLI flags or environment variables — this
// file is purely illustrative. See README.md for full usage instructions.

module.exports = {
  // Target URL to scan.
  // CLI: --url https://example.com
  // Env: SITE_URL=https://example.com
  url: 'https://example.com',

  // Strict mode lowers all detection thresholds. Expect more false positives,
  // but fewer missed real bugs. Good for CI gates.
  // CLI: --strict | Env: STRICT=true
  strict: false,

  // Debug mode injects a red outline on every element and captures an
  // extra above-the-fold screenshot per device.
  // CLI: --debug | Env: DEBUG_MODE=true
  debug: false,

  // Run browsers in headed (visible) mode — useful for debugging.
  // CLI: --headed | Env: HEADED=true
  headed: false,

  // Directory where reports and screenshots are written.
  // CLI: --out ./reports | Env: OUT_DIR=./reports
  outDir: 'test-results',

  // Detection thresholds (defaults shown — override via strict mode or fork).
  //
  // overflowTolerance  — px below which overflow is ignored (subpixel rounding)
  // visualStripContrast — brightness delta that triggers edge-leak detection
  // menuGapMax          — px gap allowed between menu overlay and viewport edge
  // shadowSuspectPx     — minimum box-shadow blur radius to flag for clipping
  thresholds: {
    overflowTolerance: 1,
    visualStripContrast: 60,
    menuGapMax: 6,
    shadowSuspectPx: 8,
  },
};
