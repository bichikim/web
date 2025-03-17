import importPlugin from 'eslint-plugin-i'
import nodePlugin from 'eslint-plugin-n'
import js from '@eslint/js'
import ts from 'typescript-eslint'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import unicorn from 'eslint-plugin-unicorn'
import jsonc from 'eslint-plugin-jsonc'
import sortKeys from 'eslint-plugin-sort-keys-fix'
import typeSortKeys from 'eslint-plugin-typescript-sort-keys'
import exportsSort from 'eslint-plugin-sort-export-all'
import stylisticTs from '@stylistic/eslint-plugin-ts'
import solid from 'eslint-plugin-solid/configs/typescript'
import * as tsParser from '@typescript-eslint/parser'

const MAX_LINES = 600

export default [
  js.configs.recommended,
  ...jsonc.configs['flat/recommended-with-jsonc'],
  nodePlugin.configs['flat/recommended'],
  ...ts.configs.recommended,
  prettierRecommended,
  unicorn.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'],
    ignores: ['**/package.json'],
    plugins: {
      format: stylisticTs,
      import: importPlugin,
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
      camelcase: [
        'error',
        {
          ignoreGlobals: true,
          ignoreImports: true,
          properties: 'always',
        },
      ],
      complexity: 'error',
      'computed-property-spacing': ['error', 'never'],
      // 'consistent-return': 'off',
      'consistent-this': 'error',
      curly: 'error',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'dot-location': ['error', 'property'],
      'dot-notation': 'error',
      'eol-last': 'error',
      eqeqeq: ['error', 'smart'],
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
      'format/object-curly-newline': [
        'warn',
        {
          consistent: true,
          multiline: true,
        },
      ],
      'format/object-curly-spacing': ['error', 'never'],
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
      'format/space-infix-ops': 'error',
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
          max: 200,
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
      // 'default-case': 'off',
      'no-fallthrough': 'off',
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
      'solid/reactivity': 'off',
      'sort-export-all/sort-export-all': 'warn',
      'sort-imports': [
        'warn',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
      'sort-keys-fix/sort-keys-fix': ['warn', 'asc', {natural: true}],
      'space-in-parens': ['error', 'never'],
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
            doc: false,
            docs: false,
            env: false,
            fn: false,
            func: false,
            nav: false,
            net: false,
            obj: false,
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
            src: false,
          },
        },
      ],
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
      'id-length': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      'no-magic-numbers': 'off',
      'prefer-destructuring': 'off',
      'solid/reactivity': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-thenable': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/prefer-global-this': 'off',
    },
  },
  {
    files: ['**/*.story.{ts,tsx}', '**/*.stories.{ts,tsx}'],
    rules: {
      'id-length': 'off',
      'no-magic-numbers': 'off',
      'solid/reactivity': 'off',
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
    files: ['**/*.{ts,tsx}'],
    ...solid,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // project: 'tsconfig.json',
      },
    },
    rules: {
      'solid/reactivity': 'off',
    },
  },
]
