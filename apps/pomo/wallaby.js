export default () => ({
  autoDetect: true,
  testFramework: {
    configFile: './vitest.wallaby.config.mts',
  },
  tests: {
    override: (testPatterns) => [
      ...testPatterns,
      '**/*.spec.?(c|m)[jt]s?(x)',
      '!**/*.story.*',
      '!**/*.stories.*',
    ],
  },
})
