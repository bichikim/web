const path = require('path')

module.exports = {
  cacheDirectory: './.jest/cache',
  collectCoverageFrom: [
    '<rootDir>/packages/*/src/**/*.{ts,tsx}',
    '<rootDir>/coong/*/src/**/*.{ts,tsx}',
    '<rootDir>/scripts/**/*.{ts,tsx}',
    '<rootDir>/coong/client/vite-vue-ssr/**/__tests__/*.spec.ts',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/*.stories.{ts,tsx}',
    '!<rootDir>/**/__tests__/*.{ts,tsx}',
    '!<rootDir>/**/types/**/*.{ts,tsx}',
  ],

  // maxWorkers: '70%',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue', 'json'],

  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/file.mock.ts',
    '\\.svg$': '<rootDir>/__mocks__/svg.mock.ts',
    quasar: 'quasar/dist/quasar.esm.prod',
  },
  projects: [
    {
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
      watchPlugins: [
        require.resolve('jest-watch-typeahead/filename'),
        require.resolve('jest-watch-typeahead/testname'),
      ],
    },
    {
      displayName: 'unit-test',
      globals: {
        __DEV__: true,
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

      snapshotSerializers: [
        'jest-serializer-vue',
        '@emotion/jest/serializer',
      ],
      testEnvironment: '@happy-dom/jest-environment',
      testMatch: [
        '!<rootDir>/coong/*/src/**/__tests__/*.e2e.ts',
        '!<rootDir>/coong/firebase/**/*.spec.ts',
        '<rootDir>/packages/*/src/**/__tests__/*.spec.ts',
        '<rootDir>/coong/*/src/**/__tests__/*.spec.ts',
        '<rootDir>/coong/client/vite-vue-ssr/**/__tests__/*.spec.ts',
        '<rootDir>/coong/client/vite-vue-ssr/__tests__/*.spec.ts',
        '<rootDir>/scripts/__tests__/*.spec.ts',
      ],
      transformIgnorePatterns: ['/node_modules/'],
      watchPlugins: [
        require.resolve('jest-watch-typeahead/filename'),
        require.resolve('jest-watch-typeahead/testname'),
      ],
    },
  ],

  setupFilesAfterEnv: [
    path.resolve(__dirname, 'jest.setup.ts'),
  ],

  snapshotSerializers: [
    'jest-serializer-vue',
    '@emotion/jest/serializer',
  ],

  testEnvironment: '@happy-dom/jest-environment',

  testPathIgnorePatterns: [
    '\\.snap$',
    '/node_modules/',
    '(/__tests__/.*|(\\.|/)(test|spec))\\.d.ts$',
  ],

  // https://github.com/facebook/jest/issues/6766
  testURL: 'http://localhost/',

  transform: {
    '.+\\.(css|styl|less|sass|scss|jpg|jpeg|png|svg|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      require.resolve('jest-transform-stub'),
    '^.+\\.jsx?$': require.resolve('babel-jest'),
    '^.+\\.vue$': '@vue/vue3-jest',
  },

  transformIgnorePatterns: ['/node_modules/'],

  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname'),
  ],
}
