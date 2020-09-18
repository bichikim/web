module.exports = {
  root: true,
  env: {
    node: true,
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx', 'vue'],
    },
  },
  extends: [
    'plugin:vue/vue3-essential',
    'plugin:@typescript-eslint/recommended',
    '@vue/standard',
    '@vue/typescript/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    useJSXTextNode: true,
    jsx: true,
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'never'],
    'space-before-function-paren': [
      'error', {
        anonymous: 'always', named: 'never', asyncArrow: 'always',
      }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/member-delimiter-style': 'off',
  },
  overrides: [
    {
      files: [
        '**/tests/**/*.spec.{j,t}s?(x)',
      ],
      env: {
        mocha: true,
      },
    },
    {
      files: ['**/tests/**/*.js', '*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
}
