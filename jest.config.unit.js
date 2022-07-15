const path = require('path')

// for wallaby runtime
module.exports = {
  cacheDirectory: './.jest/cache',
  collectCoverageFrom: [
    '<rootDir>/packages/*/src/**/*.{ts,tsx}',
    '<rootDir>/coong/*/src/**/*.{ts,tsx}',
    '<rootDir>/coong/server/**/*.{ts,tsx}',
    '<rootDir>/scripts/**/*.{ts,tsx}',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/*.stories.{ts,tsx}',
    '!<rootDir>/**/__tests__/*.{ts,tsx}',
    '!<rootDir>/**/__stories__/*.{ts,tsx}',
    '!<rootDir>/**/__mocks__/*.{ts,tsx}',
    '!<rootDir>/**/types/**/*.{ts,tsx}',
  ],
  fakeTimers: {
    legacyFakeTimers: true,
  },

  // maxWorkers: '70%',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue', 'json'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/file.mock.ts',
    '\\.svg$': '<rootDir>/__mocks__/svg.mock.ts',
    '^lodash-es/(.*)$': 'lodash/$1',
    '^lodash-es/curry$': 'lodash/curry',
    quasar: 'quasar/dist/quasar.esm.prod',
  },
  projects: [
    {
      displayName: 'unit-test',
      fakeTimers: {
        legacyFakeTimers: true,
      },
      globals: {
        __DEV__: true,
      },
      moduleNameMapper: {
        '\\.(css|scss)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/file.mock.ts',
        '\\.svg$': '<rootDir>/__mocks__/svg.mock.ts',
        '^lodash-es/(.*)$': 'lodash/$1',
      },

      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      snapshotSerializers: [],
      testEnvironment: '@happy-dom/jest-environment',
      testMatch: [
        '!<rootDir>/**/*.e2e.ts',
        '<rootDir>/packages/*/src/**/__tests__/*.spec.{ts,tsx}',
        '<rootDir>/coong/server/**/__tests__/*.spec.{ts,tsx}',
        '<rootDir>/coong/*/src/**/__tests__/*.spec.{ts,tsx}',
        '<rootDir>/scripts/__tests__/*.spec.ts',
      ],
      transformIgnorePatterns: ['/node_modules/'],
    },
  ],
  setupFilesAfterEnv: [path.resolve(__dirname, 'jest.setup.ts')],

  snapshotSerializers: [],

  testEnvironment: '@happy-dom/jest-environment',

  // https://github.com/facebook/jest/issues/6766
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },

  testPathIgnorePatterns: [
    '\\.snap$',
    '/node_modules/',
    '!/node_modules/lodash-es',
    '(/__tests__/.*|(\\.|/)(test|spec))\\.d.ts$',
  ],

  transform: {
    '^.+\\.jsx?$': require.resolve('babel-jest'),
    '^.+\\.vue$': '@vue/vue3-jest',
  },

  transformIgnorePatterns: ['/node_modules/'],
}
