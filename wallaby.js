module.exports = () => {
  return {
    autoDetect: true,
    testFramework: {
      arguments: '--selectProjects unit-test',
      configFile: './jest.config.js',
    },
  }
}
