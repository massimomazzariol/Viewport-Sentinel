'use strict';

const path = require('path');
const fs = require('fs');

function validateUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.href;
  } catch {
    return null;
  }
}

function createConfig(cliOptions = {}) {
  const rawUrl = cliOptions.url || process.env.SITE_URL;

  if (!rawUrl) {
    process.stderr.write([
      '',
      'Viewport Sentinel — ERROR: No URL provided.',
      '',
      '  Set the SITE_URL environment variable or use the --url flag:',
      '',
      '    SITE_URL=https://example.com npm run scan',
      '    node src/cli.js --url https://example.com',
      '',
    ].join('\n') + '\n');
    process.exit(1);
  }

  const siteUrl = validateUrl(rawUrl);
  if (!siteUrl) {
    process.stderr.write(
      `\nViewport Sentinel — ERROR: Invalid URL: "${rawUrl}"\n` +
      `  Must be a valid http:// or https:// URL.\n\n`
    );
    process.exit(1);
  }

  const strict = Boolean(cliOptions.strict || process.env.STRICT === 'true');
  const debug = Boolean(cliOptions.debug || process.env.DEBUG_MODE === 'true');
  const headed = Boolean(cliOptions.headed || process.env.HEADED === 'true');
  const outDir = cliOptions.out || process.env.OUT_DIR || 'test-results';
  const screenshotsDir = path.join(outDir, 'screenshots');

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const thresholds = {
    overflowTolerance: strict ? 0.5 : 1,
    visualStripContrast: strict ? 25 : 60,
    menuGapMax: strict ? 2 : 6,
    shadowSuspectPx: strict ? 4 : 8,
  };

  return {
    siteUrl,
    strict,
    debug,
    headed,
    outDir,
    screenshotsDir,
    thresholds,
    mode: strict ? 'strict' : 'standard',
  };
}

module.exports = { createConfig, validateUrl };
