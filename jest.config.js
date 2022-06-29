const config = require('./jest.config.unit')
config.projects.push({
  displayName: 'e2e-test',
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/coong/server/**/__tests__/*.e2e.ts',
    '<rootDir>/coong/*/src/**/__tests__/*.e2e.ts',
  ],
  testTimeout: 60_000,
  transformIgnorePatterns: ['/node_modules/'],
})
module.exports = config
