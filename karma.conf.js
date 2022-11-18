// Note: Playwright is used here solely to obtain the webkit executable path
// @see https://github.com/zenOSmosis/karma-webkit-launcher#headless-webkit-with-playwright
const playwright = require('playwright')
const webkitExe = playwright.webkit.executablePath()
process.env.WEBKIT_BIN = webkitExe
process.env.WEBKIT_HEADLESS_BIN = webkitExe

/**
 * exports error
 * 테스트가 최소 1개의 import 가 없을 경우 발생
 */

module.exports = (config) => {
  config.set({
    browsers: [
      //
      'ChromeHeadless',
      // "FirefoxHeadless",
      // 'WebkitHeadless',
    ],
    client: {
      // leave Jasmine Spec Runner output visible in browser
      clearContext: false,
    },
    files: [
      // Since I am researching how to mock a module,
      // karma uses files as  *.spec.ts for Jest *.test.ts for Karma to prevent test mocked jest spec files
      {pattern: 'coong/*/src/**/*.test.ts', served: false, type: 'module', watched: false},
      {pattern: 'packages/*/src/**/*.test.ts', served: false, type: 'module', watched: false},
    ],
    frameworks: ['testing-library-jasmine-dom', 'jasmine', 'vite'],

    // Make Karma work with pnpm.
    // See: https://github.com/pnpm/pnpm/issues/720#issuecomment-954120387
    plugins: Object.keys(require('./package').devDependencies).flatMap((packageName) => {
      if (!packageName.startsWith('karma-')) {
        return []
      }
      return [require(packageName)]
    }),

    reporters: ['spec'],
  })
}
