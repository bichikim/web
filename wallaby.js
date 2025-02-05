module.exports = () => {
  return {
    autoDetect: true,
    testFramework: {
      // it does not work
      // arguments: '--selectProjects unit-test',
      configFile: './vitest.config.mts',
    },
  }
}
