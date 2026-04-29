#!/usr/bin/env node
'use strict';

require('dotenv').config();

const minimist = require('minimist');
const { createConfig } = require('./config');
const { run } = require('./runner');

const argv = minimist(process.argv.slice(2), {
  string: ['url', 'out'],
  boolean: ['strict', 'debug', 'headed', 'help'],
  alias: {
    h: 'help',
    u: 'url',
    s: 'strict',
    d: 'debug',
  },
});

if (argv.help) {
  process.stdout.write(`
Viewport Sentinel — Responsive Layout QA Tool

Usage:
  node src/cli.js --url <url> [options]
  SITE_URL=https://example.com npm run scan

Options:
  --url,    -u  Target URL to scan (overrides SITE_URL env var)
  --strict, -s  Strict mode: lower thresholds, more sensitive detection
  --debug,  -d  Debug mode: inject CSS outlines, capture extra screenshots
  --headed      Run browsers in visible (headed) mode
  --out         Output directory for reports and screenshots (default: test-results)
  --help,   -h  Show this help message

Environment variables:
  SITE_URL      Target URL (required if --url is not passed)
  STRICT        true/false  (same as --strict)
  DEBUG_MODE    true/false  (same as --debug)
  HEADED        true/false  (same as --headed)
  OUT_DIR       Output directory path

Examples:
  node src/cli.js --url https://example.com
  node src/cli.js --url https://example.com --strict --debug
  node src/cli.js --url https://example.com --out ./reports
  SITE_URL=https://example.com npm run scan
  SITE_URL=https://example.com npm run scan:full

`);
  process.exit(0);
}

async function main() {
  const config = createConfig({
    url: argv.url,
    strict: argv.strict,
    debug: argv.debug,
    headed: argv.headed,
    out: argv.out,
  });

  try {
    await run(config);
  } catch (err) {
    process.stderr.write(`\nFatal error: ${err.message}\n`);
    if (config.debug) process.stderr.write(err.stack + '\n');
    process.exit(1);
  }
}

main();
