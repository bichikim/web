// const path = require('path')

module.exports = {
  cacheDirectory: './.jest/cache',
  // collectCoverageFrom: [
  //   '<rootDir>/packages/*/src/**/*.{ts,tsx}',
  //   '!<rootDir>/**/*.stories.{ts,tsx}',
  //   '!<rootDir>/**/__tests__/*.{ts,tsx}',
  // ],
  maxWorkers: '70%',
  // moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  //
  // moduleNameMapper: {
  //   '\\.(css|scss)$': 'identity-obj-proxy',
  //
  //   '\\.(jpg|jpeg|png)$': path.resolve('__mocks__/file.mock.ts'),
  //   '\\.svg$': path.resolve('__mocks__/svg.mock.ts'),
  // },

  // setupFilesAfterEnv: [
  //   // path.resolve(__dirname, 'jest.setup.js'),
  // ],

  preset: '@vue/cli-plugin-unit-jest',

  transform: {
    '^.+\\.vue$': 'vue-jest',
  },

  projects: [
    '<rootDir>/packages/*/jest.config.js',
  ],

  testPathIgnorePatterns: [
    '\\.snap$',
    '/node_modules/',
    '(/__tests__/.*|(\\.|/)(test|spec))\\.d.ts$',
  ],
}
