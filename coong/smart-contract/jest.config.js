
module.exports = {
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue', 'json'],
  testEnvironment: 'node',

  testMatch: ['**/__specs__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],

  testPathIgnorePatterns: [
    '\\.snap$',
    '/node_modules/',
    '(/__tests__/.*|(\\.|/)(test|spec))\\.d.ts$',
  ],

  transformIgnorePatterns: ['/node_modules/'],
}
