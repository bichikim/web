const path = require('path')

module.exports = {
  cacheDirectory: './.jest/cache',
  collectCoverageFrom: [
    '<rootDir>/packages/*/src/**/*.{ts,tsx}',
    '<rootDir>/scripts/**/*.{ts,tsx}',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/*.stories.{ts,tsx}',
    '!<rootDir>/**/__tests__/*.{ts,tsx}',
  ],
  maxWorkers: '70%',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue', 'json'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',

    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/file.mock.ts',
    '\\.svg$': '<rootDir>/__mocks__/svg.mock.ts',
  },

  projects: [
    {
      displayName: 'test',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      snapshotSerializers: [
        'jest-serializer-vue',
        '@emotion/jest/serializer',
      ],
      testMatch: [
        '<rootDir>/packages/*/src/**/__tests__/*.spec.ts',
        '<rootDir>/scripts/__tests__/*.spec.ts',
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

  testEnvironment: 'jsdom',

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
    '^.+\\.vue$': 'vue-jest',
  },

  transformIgnorePatterns: ['/node_modules/'],

  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname'),
  ],
}
