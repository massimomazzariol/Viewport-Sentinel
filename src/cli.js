#!/usr/bin/env node
// Viewport Sentinel. Copyright (c) 2026 Massimo Mazzariol - https://github.com/massimomazzariol/Viewport-Sentinel (Apache-2.0, see NOTICE).
'use strict';

const fs = require('fs');
const { parseArgs } = require('util');
const { createConfig } = require('./config');
const { run } = require('./runner');

// Optional .env in the working directory (SITE_URL, STRICT, DEBUG_MODE, HEADED, OUT_DIR).
if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

const { values: argv } = parseArgs({
  options: {
    url: { type: 'string', short: 'u' },
    out: { type: 'string' },
    strict: { type: 'boolean', short: 's' },
    debug: { type: 'boolean', short: 'd' },
    headed: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (argv.help) {
  process.stdout.write(`
Viewport Sentinel: responsive layout checks on real browser engines.

Usage:
  viewport-sentinel --url <url> [options]

Options:
  --url, -u     Page to scan: http(s) or file URL (or SITE_URL in the environment or .env)
  --strict, -s  Lower thresholds: more sensitive, more false positives
  --debug, -d   Outline every element and save extra screenshots
  --headed      Show the browsers
  --out         Output directory (default: test-results)
  --help, -h    This help

Exit code: 0 clean, 1 blocker or high issues (or a device failed), 2 configuration error.
`);
  process.exit(0);
}

async function main() {
  const config = createConfig(argv);
  try {
    const { results } = await run(config);
    const failing = results.some(
      (r) => r.error || r.issues.some((i) => !i.notApplicable && ['blocker', 'high'].includes(i.severity))
    );
    process.exitCode = failing ? 1 : 0;
  } catch (err) {
    process.stderr.write(`\nFatal error: ${err.message}\n`);
    if (config.debug) process.stderr.write(err.stack + '\n');
    process.exit(2);
  }
}

main();
