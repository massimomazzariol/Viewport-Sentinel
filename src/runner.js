'use strict';

const { chromium, firefox, webkit } = require('playwright');
const path = require('path');
const { DEVICES } = require('./devices');
const { detectOverflow } = require('./detectors/overflow');
const { detectEdgeLeak } = require('./detectors/edge-leak');
const { detectShadowClipping } = require('./detectors/shadow-clipping');
const { detectMobileMenu } = require('./detectors/mobile-menu');
const { generateReports } = require('./report');

const BROWSER_LAUNCHERS = { chromium, firefox, webkit };

async function scrollToTriggerLazyLoad(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let y = 0;
      const tick = () => {
        window.scrollTo(0, y);
        y += window.innerHeight * 0.8;
        if (y < document.body.scrollHeight) {
          requestAnimationFrame(tick);
        } else {
          window.scrollTo(0, 0);
          setTimeout(resolve, 200);
        }
      };
      tick();
    });
  });
  await page.waitForTimeout(300);
}

async function runDevice(page, device, config) {
  const result = {
    device: device.name,
    category: device.category,
    viewport: device.viewport,
    url: config.siteUrl,
    issues: [],
    screenshots: [],
    error: null,
    durationMs: 0,
  };

  const start = Date.now();
  const safeDevice = device.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  try {
    await page.goto(config.siteUrl, { waitUntil: 'networkidle', timeout: 30000 });

    await scrollToTriggerLazyLoad(page);

    if (config.debug) {
      await page.addStyleTag({
        content: '* { outline: 1px solid rgba(255, 0, 0, 0.3) !important; }',
      });
    }

    // Full-page screenshot
    const fullPath = path.join(config.screenshotsDir, `${safeDevice}-full.png`);
    await page.screenshot({ path: fullPath, fullPage: true });
    result.screenshots.push(fullPath);

    // Above-the-fold debug screenshot
    if (config.debug) {
      const debugPath = path.join(config.screenshotsDir, `${safeDevice}-debug.png`);
      await page.screenshot({ path: debugPath, fullPage: false });
      result.screenshots.push(debugPath);
    }

    // ── Detectors ─────────────────────────────────────────────────────────────
    log(`  [overflow]`);
    result.issues.push(...await detectOverflow(page, config));

    log(`  [edge-leak]`);
    result.issues.push(...await detectEdgeLeak(page, config));

    log(`  [shadow-clipping]`);
    result.issues.push(...await detectShadowClipping(page, config));

    if (device.isMobile || device.category === 'tablet') {
      log(`  [mobile-menu]`);
      result.issues.push(...await detectMobileMenu(page, config, device.name));
    }

  } catch (err) {
    result.error = err.message;
    log(`  ERROR: ${err.message}`);
  }

  result.durationMs = Date.now() - start;
  return result;
}

function log(msg) {
  process.stdout.write(msg + '\n');
}

async function run(config) {
  log(`\nViewport Sentinel`);
  log(`${'─'.repeat(60)}`);
  log(`URL:   ${config.siteUrl}`);
  log(`Mode:  ${config.mode}${config.debug ? ' + debug' : ''}`);
  log(`Out:   ${config.outDir}`);
  log(`${'─'.repeat(60)}`);

  const allResults = [];

  for (const device of DEVICES) {
    log(`\n[${device.category.toUpperCase()}] ${device.name} (${device.viewport.width}x${device.viewport.height})`);

    const launchFn = BROWSER_LAUNCHERS[device.browser];
    if (!launchFn) {
      log(`  SKIP: unknown browser "${device.browser}"`);
      continue;
    }

    let browser = null;
    try {
      browser = await launchFn.launch({ headless: !config.headed });

      const contextOptions = {
        viewport: device.viewport,
        isMobile: device.isMobile || false,
        hasTouch: device.hasTouch || false,
        deviceScaleFactor: device.deviceScaleFactor || 1,
      };
      if (device.userAgent) contextOptions.userAgent = device.userAgent;

      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      const result = await runDevice(page, device, config);
      allResults.push(result);

      const actionable = result.issues.filter(
        i => !i.notApplicable && i.severity !== 'pass' && i.severity !== 'info'
      ).length;
      log(`  → ${actionable} actionable issue(s) in ${result.durationMs}ms`);

    } catch (err) {
      log(`  BROWSER ERROR: ${err.message}`);
      allResults.push({
        device: device.name,
        category: device.category,
        viewport: device.viewport,
        url: config.siteUrl,
        issues: [],
        screenshots: [],
        error: err.message,
        durationMs: 0,
      });
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  const reports = await generateReports(allResults, config);

  log(`\n${'─'.repeat(60)}`);
  log(`Reports generated:`);
  log(`  JSON     → ${reports.json}`);
  log(`  Markdown → ${reports.markdown}`);
  log(`${'─'.repeat(60)}\n`);

  return { results: allResults, reports };
}

module.exports = { run };
