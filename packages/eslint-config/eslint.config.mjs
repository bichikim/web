// @ts-check

import importPlugin from 'eslint-plugin-i'
import nodePlugin from 'eslint-plugin-n'
import js from '@eslint/js'
import ts from 'typescript-eslint'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import unicorn from 'eslint-plugin-unicorn'
import jsonc from 'eslint-plugin-jsonc'
import sortKeys from 'eslint-plugin-sort-keys-fix'
import pluginVue from 'eslint-plugin-vue'
import typeSortKeys from 'eslint-plugin-typescript-sort-keys'
import exportsSort from 'eslint-plugin-sort-export-all'
// .js 인븥이면 파일을 못찾는다
// noinspection JSFileReferences
import solid from 'eslint-plugin-solid/configs/recommended.js'
import * as tsParser from '@typescript-eslint/parser'

const MAX_LINES = 600

export default [
  js.configs.recommended,
  ...jsonc.configs['flat/recommended-with-jsonc'],
  nodePlugin.configs['flat/recommended'],
  ...ts.configs.recommended,
  prettierRecommended,
  unicorn.configs['flat/recommended'],
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    ...solid,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // project: 'tsconfig.json',
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,vue}'],
    ignores: ['**/package.json'],
    plugins: {
      import: importPlugin,
      'sort-export-all': exportsSort,
      'sort-keys-fix': sortKeys,
      'typescript-sort-keys': typeSortKeys,
    },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/indent': 'off',
      '@typescript-eslint/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'none',
            requireLast: true,
          },
          singleline: {
            delimiter: 'semi',
            requireLast: false,
          },
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
      'accessor-pairs': 'error',
      'array-bracket-newline': ['error', 'consistent'],
      'array-bracket-spacing': ['error', 'never'],
      'array-callback-return': 'error',
      // 'arrow-body-style': 'off',
      'arrow-parens': ['error', 'always'],
      'arrow-spacing': [
        'error',
        {
          after: true,
          before: true,
        },
      ],
      'block-scoped-var': 'error',
      'block-spacing': ['error', 'never'],
      'brace-style': ['error', '1tbs', {allowSingleLine: true}],
      camelcase: [
        'error',
        {
          ignoreGlobals: true,
          ignoreImports: true,
          properties: 'always',
        },
      ],
      'comma-dangle': ['error', 'always-multiline'],
      'comma-spacing': [
        'error',
        {
          after: true,
          before: false,
        },
      ],
      complexity: 'error',
      'computed-property-spacing': ['error', 'never'],
      // 'consistent-return': 'off',
      'consistent-this': 'error',
      curly: 'error',
      // 'default-case': 'off',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'dot-location': ['error', 'property'],
      'dot-notation': 'error',
      'eol-last': 'error',
      eqeqeq: ['error', 'smart'],
      'func-call-spacing': ['error', 'never'],
      'func-names': ['error', 'as-needed'],
      'func-style': ['error', 'declaration', {allowArrowFunctions: true}],
      'function-call-argument-newline': ['error', 'consistent'],
      // 'function-paren-newline': 'off',
      'generator-star-spacing': [
        'error',
        {
          after: true,
          before: false,
        },
      ],
      'grouped-accessor-pairs': 'error',
      'id-length': [
        'error',
        {
          exceptions: ['_', 'x', 'y', 'z', 'p', 'm', 'h', 'w', 'b', 't', 'l', 'r'],
        },
      ],
      // 'import/named': 'off',
      // 'import/no-absolute-path': 'off',
      // 'import/no-unresolved': 'off',
      // indent: 'off',
      'jsx-quotes': ['error', 'prefer-double'],
      'key-spacing': [
        'error',
        {
          afterColon: true,
          beforeColon: false,
          mode: 'strict',
        },
      ],
      'keyword-spacing': [
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
      'line-comment-position': ['warn', {position: 'above'}],
      'max-depth': ['error', {max: 4}],
      'max-len': [
        'error',
        {
          code: 120,
          ignoreComments: true,
          ignoreTrailingComments: true,
          ignoreUrls: true,
        },
      ],
      'max-lines': ['error', MAX_LINES],
      'max-lines-per-function': [
        'error',
        {
          max: 150,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'max-nested-callbacks': ['error', {max: 3}],
      'max-params': ['error', {max: 5}],
      'max-statements': ['error', {max: 40}],
      'max-statements-per-line': ['error', {max: 2}],
      'n/no-extraneous-import': 'off',
      'n/no-missing-import': 'off',
      'no-alert': 'error',
      'no-array-constructor': 'error',
      'no-await-in-loop': 'error',
      'no-bitwise': 'error',
      'no-buffer-constructor': 'error',
      'no-caller': 'error',
      'no-catch-shadow': 'error',
      // 'no-confusing-arrow': 'off',
      'no-console': [
        // process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'warn',
        {
          allow: ['info', 'warn'],
        },
      ],
      'no-constructor-return': 'error',
      'no-continue': 'error',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-div-regex': 'error',
      'no-duplicate-imports': 'warn',
      'no-else-return': 'error',
      'no-empty-function': 'error',
      'no-eq-null': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-label': 'error',
      'no-extra-parens': ['error', 'functions'],
      'no-floating-decimal': 'error',
      'no-implicit-coercion': 'error',
      // 'no-implicit-globals': 'off',
      'no-implied-eval': 'error',
      'no-invalid-this': 'error',
      'no-iterator': 'warn',
      'no-label-var': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-lonely-if': 'error',
      'no-loop-func': 'error',
      'no-loss-of-precision': 'error',
      'no-magic-numbers': [
        'warn',
        {
          ignore: [1, -1, 0, 2],
          ignoreArrayIndexes: true,
        },
      ],
      // 'no-mixed-operators': 'off',
      'no-mixed-spaces-and-tabs': 'error',
      'no-multi-assign': 'error',
      'no-multi-spaces': 'error',
      'no-multi-str': 'error',
      'no-multiple-empty-lines': [
        'error',
        {
          max: 1,
          maxEOF: 1,
        },
      ],
      'no-negated-condition': 'error',
      // 'no-nested-ternary': 'error',
      'no-new': 'error',
      'no-new-func': 'error',
      'no-new-object': 'error',
      'no-new-require': 'error',
      'no-new-wrappers': 'error',
      'no-nonoctal-decimal-escape': 'error',
      'no-octal-escape': 'error',
      'no-param-reassign': 'error',
      'no-plusplus': 'error',
      'no-promise-executor-return': 'error',
      'no-proto': 'error',
      'no-restricted-globals': 'error',
      'no-restricted-properties': 'error',
      'no-return-assign': 'error',
      'no-return-await': 'error',
      'no-script-url': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      // 'no-shadow': 'off',
      'no-shadow-restricted-names': 'error',
      'no-tabs': 'error',
      'no-template-curly-in-string': 'error',
      'no-throw-literal': 'error',
      'no-trailing-spaces': 'error',
      'no-undef': 'off',
      'no-undef-init': 'error',
      // 'no-undefined': 'off',
      'no-unmodified-loop-condition': 'error',
      'no-unneeded-ternary': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-optional-chaining': 'error',
      // 'no-unused-expressions': 'off',
      // 'no-unused-vars': 'off',
      // 'no-use-before-define': 'off',
      'no-useless-backreference': 'error',
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      // 'no-useless-constructor': 'off',
      'no-useless-rename': 'warn',
      'no-useless-return': 'error',
      'no-var': 'error',
      'no-void': 'error',
      'no-whitespace-before-property': 'error',
      'no-with': 'error',
      'nonblock-statement-body-position': 'error',
      'object-curly-newline': [
        'warn',
        {
          consistent: true,
          multiline: true,
        },
      ],
      'object-curly-spacing': ['error', 'never'],
      'one-var': ['error', 'never'],
      'operator-assignment': ['warn', 'always'],
      'prefer-arrow-callback': 'off',
      'prefer-const': 'error',
      'prefer-destructuring': 'warn',
      'prefer-exponentiation-operator': 'warn',
      'prefer-numeric-literals': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-regex-literals': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'warn',
      'prettier/prettier': 'error',
      // numbers 타입스크립트가 12: 'foo' 에서 12 를 숫자로 인식하는 문제가 있어서
      'quote-props': ['warn', 'as-needed', {numbers: true}],
      radix: 'error',
      'require-unicode-regexp': 'warn',
      'rest-spread-spacing': 'error',
      semi: ['error', 'never'],
      'sort-export-all/sort-export-all': 'warn',
      'sort-imports': [
        'warn',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
      'sort-keys-fix/sort-keys-fix': ['warn', 'asc', {natural: true}],
      'space-before-blocks': [
        'error',
        {
          classes: 'always',
          functions: 'always',
          keywords: 'always',
        },
      ],
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          asyncArrow: 'always',
          named: 'never',
        },
      ],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      'switch-colon-spacing': [
        'error',
        {
          after: true,
        },
      ],
      'template-curly-spacing': ['error', 'never'],
      'template-tag-spacing': ['error', 'never'],
      'typescript-sort-keys/interface': 'warn',
      'typescript-sort-keys/string-enum': 'warn',
      'unicorn/consistent-function-scoping': 'warn',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            kebabCase: true,
            pascalCase: true,
          },
        },
      ],
      'unicorn/import-style': 'warn',
      'unicorn/new-for-builtins': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prevent-abbreviations': [
        'warn',
        {
          ignore: [
            //
            String.raw`\.spec$`,
          ],
          replacements: {
            arg: false,
            args: false,
            as: false,
            attr: false,
            attrs: false,
            db: false,
            env: false,
            func: false,
            nav: false,
            net: false,
            param: false,
            params: false,
            pkg: false,
            prev: false,
            prop: false,
            props: false,
            ref: false,
            refs: false,
            req: false,
            res: false,
          },
        },
      ],
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/order-in-components': 'off',
      'vue/require-default-prop': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'wrap-iife': 'error',
      'yield-star-spacing': ['error', {before: true}],
      yoda: 'error',
    },
  },
  {
    files: ['**/*.{js,cjs,cts}'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'unicorn/no-anonymous-default-export': 'off',
      'unicorn/prefer-module': 'off',
    },
  },
  {
    files: ['**/*.json'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      'comma-dangle': 'off',
      'quote-props': 'off',
      'unicorn/prefer-string-raw': 'off',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      'no-magic-numbers': 'off',
      'prefer-destructuring': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-thenable': 'off',
      'unicorn/no-useless-undefined': 'off',
      'vue/one-component-per-file': 'off',
      'vue/require-prop-types': 'off',
    },
  },
  {
    files: ['**/*.story.{ts,tsx}', '**/*.stories.{ts,tsx}'],
    rules: {
      'no-magic-numbers': 'off',
    },
  },
  {
    files: ['**/*.{ts,mts,mjs}'],
    rules: {
      'n/no-unsupported-features/node-builtins': 'off',
    },
  },
  {
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
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        extraFileExtensions: ['.vue'],
        parser: {
          js: 'espree',
          jsx: 'espree',
          mjs: 'espree',
          mts: ts.parser,
          ts: ts.parser,
          tsx: ts.parser,
        },
      },
    },
  },
]
