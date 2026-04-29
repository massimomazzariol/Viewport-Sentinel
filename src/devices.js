'use strict';

const DEVICES = [
  // ── Desktop ────────────────────────────────────────────────────────────────
  {
    name: 'Desktop Chromium',
    browser: 'chromium',
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    category: 'desktop',
  },
  {
    name: 'Desktop Firefox',
    browser: 'firefox',
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    category: 'desktop',
  },
  {
    name: 'Desktop WebKit',
    browser: 'webkit',
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    category: 'desktop',
  },

  // ── Mobile ─────────────────────────────────────────────────────────────────
  {
    name: 'iPhone SE',
    browser: 'webkit',
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    category: 'mobile',
  },
  {
    name: 'iPhone 12',
    browser: 'webkit',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    category: 'mobile',
  },
  {
    name: 'iPhone 15 Pro',
    browser: 'webkit',
    viewport: { width: 393, height: 852 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    category: 'mobile',
  },
  {
    name: 'Android Pixel',
    browser: 'chromium',
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.625,
    category: 'mobile',
  },
  {
    name: 'Samsung Galaxy',
    browser: 'chromium',
    viewport: { width: 360, height: 780 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    category: 'mobile',
  },

  // ── Tablet ─────────────────────────────────────────────────────────────────
  {
    name: 'iPad Portrait',
    browser: 'webkit',
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: false,
    hasTouch: true,
    deviceScaleFactor: 2,
    category: 'tablet',
  },
  {
    name: 'iPad Landscape',
    browser: 'webkit',
    viewport: { width: 1024, height: 768 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: false,
    hasTouch: true,
    deviceScaleFactor: 2,
    category: 'tablet',
  },
];

module.exports = { DEVICES };
