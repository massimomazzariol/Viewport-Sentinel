'use strict';

const path = require('path');
const TOGGLE_SELECTORS = require('./menu-toggles.json');

// Opens the mobile menu and checks that every item in it can actually be reached:
// on screen and not clipped or covered. Also flags overlays that overflow the viewport
// or leave a strip of page visible on the right.
async function detectMobileMenu(page, config, deviceName) {
  const { menuGapMax } = config.thresholds;
  const viewportWidth = page.viewportSize().width;

  if (viewportWidth >= 1024) {
    return [info('Mobile menu check: not applicable', `Viewport is ${viewportWidth}px wide; the check runs below 1024px.`)];
  }

  const toggle = await page.evaluate((selectors) => {
    for (const sel of selectors) {
      const el = [...document.querySelectorAll(sel)].find((e) => {
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
      });
      if (el) {
        el.setAttribute('data-vs-toggle', '');
        return { selector: sel, controls: el.getAttribute('aria-controls') };
      }
    }
    return null;
  }, TOGGLE_SELECTORS);

  if (!toggle) {
    return [info('Mobile menu: no toggle found', 'No hamburger or navigation toggle matched the known selectors.')];
  }

  const safeDevice = deviceName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  await page.screenshot({ path: path.join(config.screenshotsDir, `menu-closed-${safeDevice}.png`) });

  try {
    await page.click('[data-vs-toggle]', { timeout: 4000 });
    await page.waitForTimeout(600);
  } catch (err) {
    return [issue('mobile-menu', 'low', 'low', 'Mobile menu toggle click failed', `Found ${toggle.selector} but clicking it threw: ${err.message}`)];
  }

  await page.screenshot({ path: path.join(config.screenshotsDir, `menu-open-${safeDevice}.png`) });

  const menu = await page.evaluate(({ controls, vw, gapMax }) => {
    const visible = (e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    // The panel: what the toggle controls, else the largest positioned menu-like element with links.
    let panel = controls ? document.getElementById(controls) : null;
    if (!panel || !visible(panel)) {
      panel = [...document.querySelectorAll('[class*="menu"],[class*="nav"],[class*="drawer"],[class*="overlay"],[role="dialog"]')]
        .filter((e) => visible(e) && ['fixed', 'absolute'].includes(getComputedStyle(e).position) && e.querySelector('a[href]'))
        .sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return rb.width * rb.height - ra.width * ra.height;
        })[0];
    }
    if (!panel) {
      return null;
    }

    const links = [...panel.querySelectorAll('a[href]')];
    const unreachable = links.filter((a) => {
      const r = a.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (r.width === 0 || r.height === 0 || x < 0 || y < 0 || x > innerWidth || y > innerHeight) {
        return true;
      }
      const hit = document.elementFromPoint(x, y);
      return !hit || !(a === hit || a.contains(hit) || hit.contains(a));
    });

    const rect = panel.getBoundingClientRect();
    const right = rect.left + rect.width;
    const id = panel.id ? '#' + panel.id : panel.tagName.toLowerCase() + '.' + String(panel.className).trim().split(/\s+/)[0];
    return {
      selector: id,
      height: Math.round(rect.height),
      links: links.length,
      unreachable: unreachable.map((a) => a.textContent.trim().slice(0, 40)),
      overshoot: Math.round(right - vw),
      gap: Math.round(vw - right),
      hasOverflow: right > vw + 1,
      hasGap: vw - right > gapMax && rect.width > vw / 2,
    };
  }, { controls: toggle.controls, vw: viewportWidth, gapMax: menuGapMax });

  if (!menu) {
    return [issue('mobile-menu', 'low', 'low', 'Mobile menu: no open panel detected', `Clicked ${toggle.selector}, but no positioned panel with links appeared.`)];
  }

  const issues = [];
  if (menu.unreachable.length) {
    issues.push(issue(
      'mobile-menu-unreachable', 'blocker', 'high',
      `Mobile menu: ${menu.unreachable.length} of ${menu.links} items cannot be reached`,
      `With the menu open, these items are off screen, clipped or covered: ${menu.unreachable.join(', ')}. The panel (${menu.selector}) is ${menu.height}px tall.`,
      'An ancestor with transform, filter or backdrop-filter becomes the containing block of the fixed menu panel and clips it to its own box.',
      'Move the transform, filter or backdrop-filter from the ancestor to a pseudo-element, or render the panel outside it.'
    ));
  }
  if (menu.hasOverflow) {
    issues.push(issue('mobile-menu-overflow', 'high', 'high', 'Mobile menu overflows the viewport',
      `The panel (${menu.selector}) extends ${menu.overshoot}px past the right edge.`, null,
      'Set max-width: 100vw on the panel and check translateX or margin offsets.'));
  } else if (menu.hasGap) {
    issues.push(issue('mobile-menu-gap', 'medium', 'medium', 'Mobile menu leaves a gap on the right',
      `The panel (${menu.selector}) stops ${menu.gap}px short of the right edge (threshold ${menuGapMax}px).`, null,
      'Set width: 100vw on the panel and check for a translateX pulling it left.'));
  }
  if (!issues.length) {
    issues.push({ ...issue('mobile-menu', 'pass', 'high', 'Mobile menu OK', `All ${menu.links} items reachable with the menu open.`), notApplicable: false });
  }
  return issues;
}

function issue(type, severity, confidence, title, detail, suspectedCause = null, suggestedFix = null) {
  return { type, severity, confidence, method: 'hard', title, detail, suspectedCause, suggestedFix, notApplicable: false };
}

function info(title, detail) {
  return { type: 'mobile-menu', severity: 'info', confidence: 'high', method: 'hard', title, detail, notApplicable: true };
}

module.exports = { detectMobileMenu };
