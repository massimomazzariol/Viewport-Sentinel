'use strict';

// Heuristic: finds elements with a visible shadow that are inside a parent
// with overflow:hidden or overflow:clip, which would visually cut off the shadow.
// This is a pattern that *often* produces clipping — not a guaranteed bug.
async function detectShadowClipping(page, config) {
  const { shadowSuspectPx } = config.thresholds;

  const suspects = await page.evaluate((minBlur) => {
    function parseShadowBlur(shadowStr) {
      if (!shadowStr || shadowStr === 'none') return 0;
      // Take the first shadow value and extract numeric px values
      const first = shadowStr.split(/,(?![^(]*\))/)[0].trim();
      const nums = first.match(/-?[\d.]+px/g);
      // box-shadow: offset-x offset-y blur spread color — blur is the 3rd value
      return nums && nums.length >= 3 ? Math.abs(parseFloat(nums[2])) : 0;
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

    function findClippingAncestor(el) {
      let p = el.parentElement;
      while (p && p !== document.documentElement) {
        const s = window.getComputedStyle(p);
        const clips =
          s.overflow === 'hidden' || s.overflow === 'clip' ||
          s.overflowX === 'hidden' || s.overflowX === 'clip' ||
          s.overflowY === 'hidden' || s.overflowY === 'clip';
        if (clips) {
          return {
            selector: selectorFor(p),
            overflow: s.overflow,
            overflowX: s.overflowX,
            overflowY: s.overflowY,
            background: s.backgroundColor,
          };
        }
        p = p.parentElement;
      }
      return null;
    }

    const results = [];
    for (const el of document.querySelectorAll('*')) {
      try {
        const s = window.getComputedStyle(el);
        const hasShadow = s.boxShadow && s.boxShadow !== 'none';
        const hasDropShadow = s.filter && s.filter.includes('drop-shadow');
        if (!hasShadow && !hasDropShadow) continue;

        const blur = parseShadowBlur(s.boxShadow);
        if (!hasDropShadow && blur < minBlur) continue;

        const clip = findClippingAncestor(el);
        if (!clip) continue;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const elBg = s.backgroundColor;
        const differentBg =
          clip.background !== elBg &&
          !clip.background.includes('rgba(0, 0, 0, 0)') &&
          clip.background !== 'transparent';

        results.push({
          selector: selectorFor(el),
          tagName: el.tagName.toLowerCase(),
          shadow: s.boxShadow.substring(0, 100),
          blurPx: blur,
          hasDropShadow,
          clippingParent: { ...clip, differentBg },
          rect: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        });
      } catch (_) {}
    }

    return results.slice(0, 8);
  }, shadowSuspectPx);

  return suspects.map(s => ({
    type: 'shadow-clipping',
    severity: 'medium',
    confidence: 'low',
    method: 'heuristic',
    isHeuristic: true,
    title: `Possible shadow clipping on ${s.selector}`,
    detail:
      `<${s.tagName}> has ${
        s.hasDropShadow ? 'a CSS drop-shadow filter' : `a box-shadow (blur: ${s.blurPx}px)`
      } but is inside an overflow:${s.clippingParent.overflow || s.clippingParent.overflowX} ` +
      `parent (${s.clippingParent.selector}).` +
      (s.clippingParent.differentBg
        ? ' The parent has a distinct background colour, increasing the likelihood that clipping is visible.'
        : ''),
    element: s,
    suspectedCause:
      'A parent element with overflow:hidden or overflow:clip is cropping the shadow region.',
    suggestedFix:
      `Add padding to ${s.clippingParent.selector} equal to the shadow blur/spread, ` +
      'or remove overflow:hidden if it is not required for layout.',
  }));
}

module.exports = { detectShadowClipping };
