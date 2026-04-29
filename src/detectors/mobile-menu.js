'use strict';

const path = require('path');

// Generic selectors used to discover mobile menu toggle buttons.
// Ordered from most specific to most generic.
const TOGGLE_SELECTORS = [
  '[class*="hamburger"]',
  '[class*="menu-toggle"]',
  '[class*="nav-toggle"]',
  '[class*="menu-button"]',
  '[class*="burger"]',
  '[aria-label*="menu" i]',
  '[aria-label*="navigation" i]',
  '[aria-controls*="menu"]',
  '[aria-controls*="nav"]',
  'button[class*="menu"]',
  'button[class*="nav"]',
  '.mobile-menu-button',
  '.menu-btn',
  '#menu-button',
  '#nav-toggle',
  'nav button:first-child',
  'header button:first-child',
];

async function detectMobileMenu(page, config, deviceName) {
  const { menuGapMax } = config.thresholds;
  const vp = page.viewportSize();
  const viewportWidth = vp ? vp.width : 375;

  // Skip on wide viewports — hamburger menus typically appear below 1024px
  if (viewportWidth >= 1024) {
    return [{
      type: 'mobile-menu',
      severity: 'info',
      confidence: 'high',
      method: 'hard',
      title: 'Mobile menu check: not applicable',
      detail: `Viewport is ${viewportWidth}px wide — mobile menu detection only runs below 1024px.`,
      notApplicable: true,
    }];
  }

  // Locate a visible toggle button
  const toggleInfo = await page.evaluate((selectors) => {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (
          rect.width > 0 && rect.height > 0 &&
          style.display !== 'none' && style.visibility !== 'hidden'
        ) {
          return {
            selector: sel,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            label: el.getAttribute('aria-label') || el.textContent.trim().substring(0, 30),
          };
        }
      } catch (_) {}
    }
    return null;
  }, TOGGLE_SELECTORS);

  if (!toggleInfo) {
    return [{
      type: 'mobile-menu',
      severity: 'info',
      confidence: 'medium',
      method: 'hard',
      title: 'Mobile menu: no toggle found',
      detail: 'Could not locate a hamburger or navigation toggle button using standard selectors. This site may not use a collapsible mobile menu, or uses custom markup.',
      notApplicable: true,
    }];
  }

  const safeDevice = deviceName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  // Screenshot: closed state
  const closedPath = path.join(config.screenshotsDir, `menu-closed-${safeDevice}.png`);
  await page.screenshot({ path: closedPath, fullPage: false });

  // Click the toggle
  try {
    await page.click(toggleInfo.selector, { timeout: 4000 });
    await page.waitForTimeout(500);
  } catch (err) {
    return [{
      type: 'mobile-menu',
      severity: 'low',
      confidence: 'low',
      method: 'hard',
      title: 'Mobile menu toggle click failed',
      detail: `Found toggle (${toggleInfo.selector}) but clicking it threw: ${err.message}`,
      notApplicable: false,
    }];
  }

  // Screenshot: open state
  const openPath = path.join(config.screenshotsDir, `menu-open-${safeDevice}.png`);
  await page.screenshot({ path: openPath, fullPage: false });

  // Measure any overlay panels that appeared
  const overlays = await page.evaluate((vw, gapMax) => {
    const candidates = Array.from(
      document.querySelectorAll('[class*="menu"],[class*="nav"],[class*="drawer"],[class*="overlay"],[class*="sidebar"],[class*="panel"]')
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return (
        rect.width > 0 && rect.height > 50 &&
        s.display !== 'none' && s.visibility !== 'hidden' &&
        (s.position === 'fixed' || s.position === 'absolute')
      );
    });

    return candidates.map(el => {
      const rect = el.getBoundingClientRect();
      const rightEdge = rect.left + rect.width;
      const gap = vw - rightEdge;
      const id = el.id ? '#' + el.id : null;
      const cls = el.className && typeof el.className === 'string'
        ? el.className.trim().split(/\s+/)[0]
        : '';
      return {
        selector: id || (cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase()),
        width: Math.round(rect.width),
        rightEdge: Math.round(rightEdge),
        gap: Math.round(gap),
        overshoot: Math.round(rightEdge - vw),
        hasGap: gap > gapMax,
        hasOverflow: rightEdge > vw + 1,
        position: window.getComputedStyle(el).position,
      };
    });
  }, viewportWidth, menuGapMax);

  const issues = [];

  for (const overlay of overlays) {
    if (overlay.hasOverflow) {
      issues.push({
        type: 'mobile-menu-overflow',
        severity: 'high',
        confidence: 'high',
        method: 'hard',
        title: 'Mobile menu overlay overflows viewport',
        detail:
          `The menu overlay (${overlay.selector}) extends ${overlay.overshoot}px past the right ` +
          `viewport edge (${viewportWidth}px wide viewport).`,
        element: overlay,
        suspectedCause: 'The overlay width exceeds 100vw, or a translate/margin pushes it beyond the viewport.',
        suggestedFix: 'Set max-width: 100vw on the overlay. Check for translateX or margin offsets.',
      });
    } else if (overlay.hasGap) {
      issues.push({
        type: 'mobile-menu-gap',
        severity: 'medium',
        confidence: 'medium',
        method: 'hard',
        title: 'Mobile menu overlay has right-edge gap',
        detail:
          `The menu overlay (${overlay.selector}) is ${overlay.gap}px short of the right viewport ` +
          `edge (threshold: ${menuGapMax}px). This may appear as a visible strip of page content ` +
          `behind the menu.`,
        element: overlay,
        suspectedCause: 'Overlay width is less than 100vw, or a transform/translateX offsets it inward.',
        suggestedFix: 'Set width: 100vw on the overlay and verify there is no translateX pulling it left.',
      });
    }
  }

  if (overlays.length === 0) {
    issues.push({
      type: 'mobile-menu',
      severity: 'low',
      confidence: 'low',
      method: 'hard',
      title: 'Mobile menu: overlay not detected after toggle click',
      detail: `Toggle (${toggleInfo.selector}) was found and clicked, but no positioned overlay appeared. The menu may use inline rendering, animations that delay visibility, or non-standard markup.`,
      notApplicable: false,
    });
  }

  if (issues.length === 0) {
    issues.push({
      type: 'mobile-menu',
      severity: 'pass',
      confidence: 'medium',
      method: 'hard',
      title: 'Mobile menu appears OK',
      detail: `Toggle found and clicked (${toggleInfo.selector}). No overflow or gap detected in menu overlay elements.`,
      notApplicable: false,
    });
  }

  return issues;
}

module.exports = { detectMobileMenu };
