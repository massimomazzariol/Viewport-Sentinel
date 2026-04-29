'use strict';

const { PNG } = require('pngjs');

// Samples the rightmost strip of a screenshot and compares brightness against
// a reference strip 40px inward. A significantly brighter right edge indicates
// a white or light-coloured gap that is visually separate from page content.
async function detectEdgeLeak(page, config) {
  const { visualStripContrast } = config.thresholds;

  let screenshotBuffer;
  try {
    screenshotBuffer = await page.screenshot({ fullPage: false });
  } catch {
    return [];
  }

  return new Promise((resolve) => {
    const png = new PNG();
    png.parse(screenshotBuffer, (err, data) => {
      if (err || !data) return resolve([]);

      const { width, height } = data;
      if (width < 50 || height < 50) return resolve([]);

      // Sample column 2px from right vs 42px from right
      const edgeX = width - 2;
      const refX = width - 42;

      let edgeSum = 0;
      let refSum = 0;
      let samples = 0;

      const step = Math.max(1, Math.floor(height / 120));
      for (let y = 0; y < height; y += step) {
        const ei = (y * width + edgeX) * 4;
        const ri = (y * width + refX) * 4;
        if (ei + 2 >= data.data.length || ri + 2 >= data.data.length) continue;

        edgeSum += (data.data[ei] + data.data[ei + 1] + data.data[ei + 2]) / 3;
        refSum  += (data.data[ri] + data.data[ri + 1] + data.data[ri + 2]) / 3;
        samples++;
      }

      if (samples === 0) return resolve([]);

      const avgEdge = edgeSum / samples;
      const avgRef  = refSum  / samples;
      const contrast = avgEdge - avgRef;

      if (contrast > visualStripContrast) {
        resolve([{
          type: 'edge-leak',
          severity: 'high',
          confidence: 'medium',
          method: 'visual',
          title: 'Visual right-edge leak detected',
          detail:
            `The right-edge pixel strip is ${Math.round(contrast)} brightness units lighter ` +
            `than the reference strip 40px inward (threshold: ${visualStripContrast}). ` +
            `This suggests a visible white or light-coloured gap on the right edge of the page.`,
          contrastDelta: Math.round(contrast),
          avgEdgeBrightness: Math.round(avgEdge),
          avgRefBrightness: Math.round(avgRef),
          suspectedCause:
            'A section or container background does not extend to the full viewport width.',
          suggestedFix:
            'Inspect full-width sections. Ensure background colors and images cover 100vw. ' +
            'Look for explicit pixel widths or missing overflow:hidden on the <body>.',
        }]);
      } else {
        resolve([]);
      }
    });
  });
}

module.exports = { detectEdgeLeak };
