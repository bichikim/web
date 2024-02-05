import type {Config} from 'jest'
// process.env.TZ = 'Europe/London'
// for wallaby runtime
const config: Config = {
  collectCoverageFrom: [
    '<rootDir>/packages/*/src/**/*.{ts,tsx}',
    '<rootDir>/coong/*/src/**/*.{ts,tsx}',
    '<rootDir>/scripts/**/*.{ts,tsx}',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/*.stories.{ts,tsx}',
    '!<rootDir>/**/__tests__/*',
    '!<rootDir>/**/__stories__/*',
    '!<rootDir>/**/__mocks__/*',
    '!<rootDir>/**/types/**/*.{ts,tsx}',
  ],

  // maxWorkers: '70%',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue', 'json', 'node', 'mjs', 'cjs'],

  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/file.mock.ts',
    '\\.svg$': '<rootDir>/__mocks__/svg.mock.ts',
  },
  projects: [
    {
      displayName: 'unit-test',
      globals: {
        __DEV__: true,
      },
      moduleNameMapper: {
        '\\.(css|scss)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/file.mock.ts',
        '\\.svg$': '<rootDir>/__mocks__/svg.mock.ts',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      testEnvironment: 'jest-environment-jsdom',
      testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons'],
        url: 'http://localhost/',
      },
      testMatch: [
        '!<rootDir>/**/*.e2e.{ts,tsx}',
        '<rootDir>/packages/*/src/**/__tests__/*.spec.{ts,tsx}',
        '<rootDir>/coong/*/src/**/__tests__/*.spec.{ts,tsx}',
        '<rootDir>/scripts/**/__tests__/*.spec.{ts,tsx}',
      ],
      testPathIgnorePatterns: [
        //
        '<rootDir>/packages/utils/src/',
        '<rootDir>/coong/coong-client/src/',
      ],
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
        '^.+\\.tsx?$': 'babel-jest',
        '^.+\\.vue$': '@vue/vue3-jest',
      },
      transformIgnorePatterns: ['/node_modules/'],
    },
  ],

  testEnvironment: 'jest-environment-node',

  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  testPathIgnorePatterns: [
    '\\.snap$',
    '/node_modules/',
    '(/__tests__/.*|(\\.|/)(test|spec))\\.d.ts$',
  ],

  // https://github.com/facebook/jest/issues/6766

  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.vue$': '@vue/vue3-jest',
  },

  transformIgnorePatterns: ['/node_modules/', '!/node_modules/@tanstack/vue-query/'],
}

export default config
