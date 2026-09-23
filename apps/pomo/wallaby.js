export default () => ({
  autoDetect: true,
  testFramework: {
    configFile: './vitest.wallaby.config.mts',
  },
  tests: {
    override: (testPatterns) => [
      ...testPatterns,
      '__tests__/**/*.spec.?(c|m)[jt]s?(x)',
      'scripts/**/*.spec.?(c|m)[jt]s?(x)',
      'src/**/*.spec.?(c|m)[jt]s?(x)',
      '!**/*.story.*',
      '!**/*.stories.*',
    ],
  },
})
