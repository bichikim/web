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
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],

  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',

    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/file.mock.ts',
    '\\.svg$': '<rootDir>/__mocks__/svg.mock.ts',
  },

  setupFilesAfterEnv: [
    // path.resolve(__dirname, 'jest.setup.js'),
  ],

  preset: '@vue/cli-plugin-unit-jest',

  transform: {
    '^.+\\.vue$': 'vue-jest',
  },

  projects: [
    {
      displayName: 'test',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      testMatch: [
        '<rootDir>/packages/*/src/**/__tests__/*.spec.ts',
        '<rootDir>/scripts/__tests__/*.spec.ts',
      ],
    },
  ],

  testPathIgnorePatterns: [
    '\\.snap$',
    '/node_modules/',
    '(/__tests__/.*|(\\.|/)(test|spec))\\.d.ts$',
  ],
}
