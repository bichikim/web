module.exports = () => {
  return {
    autoDetect: true,
    testFramework: {
      // it does not work
      arguments: '--selectProjects unit-test',
      configFile: './jest.config.unit.js',
    },
  }
}
