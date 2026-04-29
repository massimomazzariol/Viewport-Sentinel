'use strict';

async function detectOverflow(page, config) {
  const issues = [];
  const { overflowTolerance } = config.thresholds;

  // ── 1. Document-level overflow ──────────────────────────────────────────────
  const docOverflow = await page.evaluate((tolerance) => {
    const root = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(root.scrollWidth, body ? body.scrollWidth : 0);
    const clientW = root.clientWidth;
    const overflow = scrollW - clientW;

    if (overflow <= tolerance) return null;

    // Confirm it's real by attempting to scroll
    const prevX = window.scrollX;
    window.scrollTo(scrollW + 100, 0);
    const scrolled = window.scrollX;
    window.scrollTo(0, 0);

    return { scrollWidth: scrollW, clientWidth: clientW, overflow, scrollable: scrolled > 0 };
  }, overflowTolerance);

  if (docOverflow) {
    issues.push({
      type: 'horizontal-overflow',
      severity: 'blocker',
      confidence: 'high',
      method: 'hard',
      title: 'Horizontal scroll detected',
      detail:
        `Document scrollWidth (${docOverflow.scrollWidth}px) exceeds viewport width ` +
        `(${docOverflow.clientWidth}px) by ${docOverflow.overflow}px.` +
        (docOverflow.scrollable ? ' Confirmed: page physically scrolls horizontally.' : ''),
      overflowPx: docOverflow.overflow,
      suspectedCause:
        'An element or its margin/padding extends beyond the right edge of the viewport.',
      suggestedFix:
        'Inspect elements near the right edge. Common causes: negative margins, ' +
        'absolute positioning without bounds, 100vw elements with scrollbar offsets, ' +
        'or children wider than their parent.',
    });
  }

  // ── 2. Element-level overflow — find the worst offenders ───────────────────
  const offenders = await page.evaluate((tolerance) => {
    const viewportW = document.documentElement.clientWidth;

    function isClippedByAncestor(el) {
      let p = el.parentElement;
      while (p && p !== document.documentElement) {
        const s = window.getComputedStyle(p);
        if (
          s.overflow === 'hidden' || s.overflow === 'clip' ||
          s.overflowX === 'hidden' || s.overflowX === 'clip'
        ) return true;
        p = p.parentElement;
      }
      return false;
    }

    function selectorFor(el) {
      if (el.id) return '#' + el.id;
      const tag = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const cls = el.className.trim().split(/\s+/).slice(0, 2).join('.');
        return cls ? `${tag}.${cls}` : tag;
      }
      return tag;
    }

    const results = [];
    for (const el of document.querySelectorAll('*')) {
      try {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const rightEdge = rect.left + rect.width + window.scrollX;
        const overshoot = rightEdge - viewportW;
        if (overshoot > tolerance && !isClippedByAncestor(el)) {
          const s = window.getComputedStyle(el);
          results.push({
            selector: selectorFor(el),
            tagName: el.tagName.toLowerCase(),
            rightEdge: Math.round(rightEdge),
            overshoot: Math.round(overshoot),
            width: Math.round(rect.width),
            top: Math.round(rect.top + window.scrollY),
            position: s.position,
            display: s.display,
            boxSizing: s.boxSizing,
            maxWidth: s.maxWidth,
            overflow: s.overflow,
          });
        }
      } catch (_) {}
    }

    return results.sort((a, b) => b.overshoot - a.overshoot).slice(0, 5);
  }, overflowTolerance);

  for (const el of offenders) {
    issues.push({
      type: 'element-overflow',
      severity: 'blocker',
      confidence: 'high',
      method: 'hard',
      title: `Element overflows viewport: <${el.tagName}>`,
      detail:
        `${el.selector} extends ${el.overshoot}px past the right viewport edge ` +
        `(right=${el.rightEdge}px, position: ${el.position}, width: ${el.width}px).`,
      element: el,
      suspectedCause:
        'Element width, padding, or margin pushes the right edge past the viewport boundary.',
      suggestedFix:
        `Check max-width, box-sizing, and padding on ${el.selector} and its parent containers. ` +
        'Ensure it respects the viewport width with overflow:hidden or constrained sizing.',
    });
  }

  return issues;
}

module.exports = { detectOverflow };
