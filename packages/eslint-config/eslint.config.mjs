import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import stylisticTs from '@stylistic/eslint-plugin-ts'
import jsonc from 'eslint-plugin-jsonc'
import nodePlugin from 'eslint-plugin-n'
import oxlint from 'eslint-plugin-oxlint'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import solid from 'eslint-plugin-solid/configs/typescript'
import exportsSort from 'eslint-plugin-sort-export-all'
import sortKeys from 'eslint-plugin-sort-keys-fix'
import typeSortKeys from 'eslint-plugin-typescript-sort-keys'
import ts from 'typescript-eslint'

const MAX_LINES = 600

const sharedConfig = {
  ignores: [
    '**/dist/**/*',
    '**/*.md',
    '**/*.d.ts',
    'apps/server/src/prisma/type-graphql/**/*',
    'packages/lodash/src/lodash/**/*',
    '**/__generated__/**/*',
    'docs/.vitepress/cache/**/*',
    'apps/coong-client/android/**/*',
    'apps/coong-client/ios/**/*',
  ],
  plugins: {
    format: stylistic,
    'format-ts': stylisticTs,
    'sort-export-all': exportsSort,
    'sort-keys-fix': sortKeys,
    'typescript-sort-keys': typeSortKeys,
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/no-empty-object-type': [
      'error',
      {
        allowInterfaces: 'with-single-extends',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTernary: true,
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        args: 'all',
        argsIgnorePattern: '^_+$',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_+$',
        destructuredArrayIgnorePattern: '^_+$',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_+$',
      },
    ],
    // 'accessor-pairs': 'error',
    'format/array-bracket-newline': ['error', 'consistent'],
    'format/array-bracket-spacing': ['error', 'never'],
    // 'array-callback-return': 'error',
    // // 'arrow-body-style': 'off',
    'format/arrow-parens': ['error', 'always'],
    'format/block-spacing': ['error', 'never'],
    'format/brace-style': ['error', '1tbs', {allowSingleLine: true}],
    'format/comma-dangle': ['error', 'always-multiline'],
    'format/comma-spacing': [
      'error',
      {
        after: true,
        before: false,
      },
    ],
    // 'arrow-spacing': [
    //   'error',
    //   {
    //     after: true,
    //     before: true,
    //   },
    // ],
    // camelcase: [
    //   'error',
    //   {
    //     ignoreGlobals: true,
    //     ignoreImports: true,
    //     properties: 'always',
    //   },
    // ],
    // complexity: 'error',
    'format/computed-property-spacing': ['error', 'never'],

    // // 'consistent-return': 'off',
    // 'consistent-this': 'error',
    // 'dot-location': ['error', 'property'],
    // 'dot-notation': 'error',
    'format/eol-last': 'error',

    // 'func-call-spacing': ['error', 'never'],
    // 'func-style': ['error', 'declaration', {allowArrowFunctions: true}],
    // 'function-call-argument-newline': ['error', 'consistent'],
    // // 'function-paren-newline': 'off',
    // 'generator-star-spacing': [
    //   'error',
    //   {
    //     after: true,
    //     before: false,
    //   },
    // ],

    // // 'import/named': 'off',
    // // 'import/no-absolute-path': 'off',
    // // 'import/no-unresolved': 'off',
    // // indent: 'off',
    'format/jsx-quotes': ['error', 'prefer-double'],

    'format/key-spacing': [
      'error',
      {
        afterColon: true,
        beforeColon: false,
        mode: 'strict',
      },
    ],

    'format/keyword-spacing': [
      'error',
      {
        after: true,
        before: true,
        overrides: {
          catch: {after: true},
          for: {after: true},
          if: {after: true},
          switch: {after: true},
          while: {after: true},
        },
      },
    ],

    // 'n/no-missing-import': 'off',
    // 'n/no-unpublished-import': 'off',
    // /**
    //  * Disable es-syntax check because the code is transpiled
    //  */
    // 'n/no-unsupported-features/es-syntax': 'off',
    // 'no-array-constructor': 'error',
    // 'no-buffer-constructor': 'error',
    // 'no-catch-shadow': 'error',
    // // 'no-confusing-arrow': 'off',
    // 'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // 'no-extra-parens': ['error', 'functions'],
    // // 'default-case': 'off',
    'format/no-floating-decimal': 'error',

    // 'no-implicit-coercion': 'error',
    // // 'no-implicit-globals': 'off',
    // 'no-implied-eval': 'error',
    // 'no-invalid-this': 'error',
    // 'no-loop-func': 'error',
    // // 'no-mixed-operators': 'off',
    // 'no-mixed-spaces-and-tabs': 'error',
    // 'no-multi-spaces': 'error',
    // 'no-multiple-empty-lines': [
    //   'error',
    //   {
    //     max: 1,
    //     maxEOF: 1,
    //   },
    // ],
    // // 'no-nested-ternary': 'error',
    // 'no-new': 'error',
    // 'no-octal-escape': 'error',
    // 'no-param-reassign': 'error',
    // 'no-promise-executor-return': 'error',
    // 'no-restricted-properties': 'error',
    // 'no-return-await': 'error',
    // 'no-script-url': 'error',
    // 'no-sequences': 'error',
    // // 'no-shadow': 'off',
    // 'no-tabs': 'error',
    // 'no-trailing-spaces': 'error',
    // 'no-undef-init': 'error',
    // // 'no-undefined': 'off',
    // 'no-unmodified-loop-condition': 'error',
    // 'no-unneeded-ternary': 'error',
    // 'no-unreachable-loop': 'error',
    // 'no-unsafe-optional-chaining': 'error',
    // // 'no-unused-expressions': 'off',
    // // 'no-unused-vars': 'off',
    // // 'no-use-before-define': 'off',
    // 'no-useless-backreference': 'error',
    // 'no-useless-call': 'error',
    // 'no-useless-computed-key': 'error',
    // 'no-useless-concat': 'error',
    // // 'no-useless-constructor': 'off',
    // 'no-useless-rename': 'warn',
    // 'no-useless-return': 'error',
    // 'one-var': ['error', 'never'],
    // 'prefer-arrow-callback': 'off',
    // 'prefer-const': 'error',
    // 'prefer-destructuring': 'warn',
    // 'prefer-regex-literals': 'error',
    // 'prefer-template': 'warn',
    // 'require-unicode-regexp': 'warn',
    // // numbers 타입스크립트가 12: 'foo' 에서 12 를 숫자로 인식하는 문제가 있어서
    'format/no-whitespace-before-property': 'error',

    'format/nonblock-statement-body-position': 'error',

    'format/object-curly-newline': [
      'warn',
      {
        consistent: true,
        multiline: true,
      },
    ],

    'format/object-curly-spacing': ['error', 'never'],

    'format/one-var-declaration-per-line': 'error',

    'format/padding-line-between-statements': [
      'warn',
      {blankLine: 'never', next: 'expression', prev: '*'},
      {blankLine: 'never', next: 'import', prev: 'import'},
      {blankLine: 'always', next: 'export', prev: 'import'},
      {blankLine: 'always', next: 'return', prev: '*'},
      {blankLine: 'always', next: 'block-like', prev: '*'},
      {blankLine: 'always', next: 'block', prev: '*'},
      {blankLine: 'always', next: 'block-like', prev: '*'},
      {blankLine: 'always', next: 'expression', prev: 'const'},
      {blankLine: 'always', next: 'expression', prev: 'let'},
      {blankLine: 'always', next: 'multiline-expression', prev: '*'},
      {blankLine: 'always', next: 'multiline-block-like', prev: '*'},
      {blankLine: 'always', next: 'multiline-const', prev: '*'},
      {blankLine: 'always', next: 'function', prev: '*'},
      {blankLine: 'always', next: 'if', prev: '*'},
      {blankLine: 'always', next: 'expression', prev: 'if'},
      {blankLine: 'always', next: 'expression', prev: 'import'},
      {blankLine: 'always', next: 'expression', prev: 'function'},
      {blankLine: 'always', next: 'for', prev: '*'},
      {blankLine: 'always', next: 'expression', prev: 'for'},
    ],

    'format/quote-props': ['warn', 'as-needed', {numbers: true}],

    'format/rest-spread-spacing': 'error',

    'format/semi': ['error', 'never'],

    'format/space-before-blocks': [
      'error',
      {
        classes: 'always',
        functions: 'always',
        keywords: 'always',
      },
    ],

    'format/space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        asyncArrow: 'always',
        named: 'never',
      },
    ],

    'format/space-in-parens': ['error', 'never'],

    'format/space-infix-ops': 'error',

    'format/space-unary-ops': 'error',

    'format/switch-colon-spacing': [
      'error',
      {
        after: true,
      },
    ],

    'format/template-curly-spacing': ['error', 'never'],

    'format/template-tag-spacing': ['error', 'never'],

    'format/wrap-iife': 'error',

    'format/yield-star-spacing': ['error', {before: true}],
    // 'line-comment-position': ['warn', {position: 'above'}],
    // 'max-len': [
    //   'error',
    //   {
    //     code: 120,
    //     ignoreComments: true,
    //     ignoreTrailingComments: true,
    //     ignoreUrls: true,
    //   },
    // ],
    // 'max-params': ['error', {max: 5}],
    // 'max-statements': ['error', {max: 40}],
    // 'max-statements-per-line': ['error', {max: 2}],
    'n/no-extraneous-import': 'off',
    'n/no-missing-import': 'off',
    'solid/reactivity': 'off',
    'sort-export-all/sort-export-all': 'warn',
    // 'sort-imports': [
    //   'warn',
    //   {
    //     ignoreCase: true,
    //     ignoreDeclarationSort: true,
    //   },
    // ],
    'sort-keys-fix/sort-keys-fix': ['warn', 'asc', {natural: true}],
    'typescript-sort-keys/interface': 'warn',
    'typescript-sort-keys/string-enum': 'warn',
  },
}

export default [
  ...ts.config(
    js.configs.recommended,
    ts.configs.recommended,
    nodePlugin.configs['flat/recommended'],
    prettierRecommended,
    {
      ...sharedConfig,
      files: ['**/*.spec.ts'],
      rules: {
        ...sharedConfig.rules,
        'id-length': 'off',
        'max-lines-per-function': 'off',
        'max-nested-callbacks': 'off',
        'no-magic-numbers': 'off',
        'prefer-destructuring': 'off',
        'solid/reactivity': 'off',
      },
    },
    {
      ...sharedConfig,
      files: ['**/*.story.{ts,tsx}', '**/*.stories.{ts,tsx}'],
      rules: {
        ...sharedConfig.rules,
        'id-length': 'off',
        'no-magic-numbers': 'off',
        'solid/reactivity': 'off',
      },
    },
    {
      ...sharedConfig,
      files: ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'],
      ignores: [...sharedConfig.ignores, '**/*.spec.ts'],
      languageOptions: {
        sourceType: 'module',
      },
      plugins: {
        ...sharedConfig.plugins,
        ...solid.plugins,
      },
      rules: {
        ...solid.rules,
        ...sharedConfig.rules,
        // 'solid/reactivity': 'off',
      },
    },
  ),
  {
    files: ['**/*.json', '**/*.jsonc'],
    language: 'json/json',
    plugins: {
      'sort-keys-fix': sortKeys,
    },
    rules: {
      'sort-keys-fix/sort-keys-fix': ['warn', 'asc', {natural: true}],
    },
  },
  ...jsonc.configs['flat/recommended-with-jsonc'],
  ...oxlint.buildFromOxlintConfig({}),
]
