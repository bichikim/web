module.exports = {
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'vue', 'json'],
  testEnvironment: 'node',

  testMatch: ['**/__specs__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],

  testPathIgnorePatterns: [
    String.raw`\.snap$`,
    '/node_modules/',
    String.raw`(/__tests__/.*|(\.|/)(test|spec))\.d.ts$`,
  ],

  transformIgnorePatterns: ['/node_modules/'],
}
