module.exports = {
  env: {node: true},
  extends: [
    'plugin:vue/vue3-recommended',
    'plugin:unicorn/recommended',
    'plugin:import/recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint:recommended',
    '@vue/typescript/recommended',
  ],
  globals: {
    Capacitor: true,
    __QUASAR_SSR_CLIENT__: true,
    __QUASAR_SSR_PWA__: true,
    __QUASAR_SSR_SERVER__: true,
    __QUASAR_SSR__: true,
    __statics: true,
    chrome: true,
    // Google Analytics
    cordova: true,
    ga: true,
    process: true,
  },
  overrides: [
    {
      env: {jest: true},
      files: [
        '**/*.spec.{j,t}s?(x)',
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'max-len': 'off',
        'max-lines-per-function': 'off',
        'max-nested-callbacks': 'off',
        'max-statements': 'off',
        'no-magic-numbers': 'off',
        'prefer-destructuring': 'off',
        'unicorn/consistent-function-scoping': 'off',
        'vue/one-component-per-file': 'off',
        'vue/require-prop-types': 'off',
      },
    },
    {
      files: [
        '**/*.js',
      ],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'unicorn/prefer-module': 'off',
      },
    },
    {
      files: [
        '.eslintrc.js',
      ],
      rules: {'no-magic-numbers': 'off'},
    },
    {
      files: ['**/*.vue'],
      rules: {'@typescript-eslint/no-unused-vars': 'off'},
    },
  ],
  parserOptions: {
    ecmaVersion: 2020,
    jsx: true,
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    useJSXTextNode: true,
  },
  plugins: [
    'import',
    'sort-keys-fix',
    'typescript-sort-keys',
  ],
  root: true,
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/member-delimiter-style': [
      'error', {
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
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-unused-expressions': [
      'error', {
        allowShortCircuit: true,
        allowTernary: true,
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        args: 'after-used',
        argsIgnorePattern: '^_+$',
        ignoreRestSiblings: true,
      },
    ],
    'accessor-pairs': 'error',
    'array-bracket-newline': ['error', 'consistent'],
    'array-bracket-spacing': ['error', 'never'],
    'array-callback-return': 'error',
    'arrow-parens': ['error', 'always'],
    'arrow-spacing': ['error',
      {
        after: true,
        before: true,
      }],
    'block-scoped-var': 'error',
    'block-spacing': ['error', 'never'],
    'brace-style': ['error', '1tbs', {allowSingleLine: true}],
    camelcase: [
      'error', {
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
    'consistent-return': 'off',
    'consistent-this': 'error',
    curly: 'error',
    'default-case': 'off',
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
    'function-paren-newline': ['error', 'consistent'],
    'generator-star-spacing': ['error',
      {
        after: false,
        before: true,
      }],
    'grouped-accessor-pairs': 'error',
    'id-length': ['error', {exceptions: ['_', 'x', 'y', 'z', 'p', 'm', 'h']}],
    'import/named': 'off',
    'import/no-absolute-path': 'off',
    'import/no-unresolved': 'off',
    indent: [
      'error', 2, {
        SwitchCase: 1,
      },
    ],
    'jsx-quotes': ['error', 'prefer-single'],
    'key-spacing': [
      'error', {
        afterColon: true,
        beforeColon: false,
        mode: 'strict',
      },
    ],
    'keyword-spacing': [
      'error', {
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
    // 'linebreak-style': ['error', 'unix'],
    'max-classes-per-file': 'error',

    'max-depth': ['error', {max: 4}],
    'max-len': [
      'error', {
        code: 120,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
      },
    ],
    'max-lines': ['error', 600],
    'max-lines-per-function': [
      'error', {
        max: 100,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
    'max-nested-callbacks': ['error', {max: 3}],
    'max-params': ['error', {max: 4}],
    'max-statements': ['error', {max: 20}],
    'max-statements-per-line': ['error', {max: 2}],
    'no-alert': 'error',
    'no-array-constructor': 'error',
    'no-await-in-loop': 'error',
    'no-bitwise': 'error',
    'no-buffer-constructor': 'error',
    'no-caller': 'error',
    'no-catch-shadow': 'error',
    // typescript decoration error
    // 'new-cap': 'error',
    'no-confusing-arrow': 'warn',

    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
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
    'no-implicit-globals': 'off',
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
      'error',
      {
        ignore: [1, -1, 0, 2],
        ignoreArrayIndexes: true,
      },
    ],
    'no-mixed-operators': 'error',
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
    'no-shadow': 'off',
    'no-shadow-restricted-names': 'error',
    'no-tabs': 'error',
    'no-template-curly-in-string': 'error',
    'no-throw-literal': 'error',
    'no-trailing-spaces': 'error',
    'no-undef': 'off',
    'no-undef-init': 'error',
    'no-undefined': 'off',
    'no-unmodified-loop-condition': 'error',
    'no-unneeded-ternary': 'error',
    'no-unreachable-loop': 'error',
    'no-unsafe-optional-chaining': 'error',
    'no-unused-expressions': 'off',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'no-useless-backreference': 'error',
    'no-useless-call': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-concat': 'error',
    'no-useless-constructor': 'warn',
    'no-useless-rename': 'warn',
    'no-useless-return': 'error',
    'no-var': 'error',
    'no-void': 'error',
    'no-whitespace-before-property': 'error',
    'no-with': 'error',
    'nonblock-statement-body-position': 'error',
    'object-curly-newline': [
      'warn', {
        consistent: true,
        multiline: true,
      },
    ],
    'object-curly-spacing': ['error', 'never'],
    'one-var': ['error', 'never'],
    'operator-assignment': ['warn', 'always'],
    'prefer-arrow-callback': 'warn',
    'prefer-const': 'error',
    'prefer-destructuring': 'warn',
    'prefer-exponentiation-operator': 'warn',
    'prefer-named-capture-group': 'error',
    'prefer-numeric-literals': 'error',
    'prefer-object-spread': 'error',
    'prefer-promise-reject-errors': 'error',
    'prefer-regex-literals': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'warn',

    'quote-props': ['error', 'as-needed'],
    quotes: ['error', 'single'],
    radix: 'error',
    'require-unicode-regexp': 'error',
    'rest-spread-spacing': 'error',
    semi: ['error', 'never'],
    'sort-imports': [
      'warn',
      {
        ignoreCase: true,
        ignoreDeclarationSort: true,
      },
    ],
    'sort-keys-fix/sort-keys-fix': ['warn', 'asc', {natural: false}],
    'space-before-blocks': [
      'error', {
        classes: 'always',
        functions: 'always',
        keywords: 'always',
      },
    ],
    'space-before-function-paren': [
      'error', {
        anonymous: 'always',
        asyncArrow: 'always',
        named: 'never',
      },
    ],
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': 'error',
    'space-unary-ops': 'error',
    'switch-colon-spacing': [
      'error', {
        after: false,
      },
    ],
    'template-curly-spacing': ['error', 'never'],
    'template-tag-spacing': ['error', 'never'],
    'typescript-sort-keys/interface': 'warn',
    'typescript-sort-keys/string-enum': 'warn',
    'unicorn/consistent-function-scoping': 'warn',
    'unicorn/filename-case': [
      'warn', {
        cases: {
          kebabCase: true,
          pascalCase: true,
        },
      },
    ],
    'unicorn/new-for-builtins': 'off',
    'unicorn/no-abusive-eslint-disable': 'off',
    'unicorn/no-array-for-each': 'off',
    'unicorn/no-array-reduce': 'off',
    'unicorn/no-nested-ternary': 'off',
    'unicorn/no-null': 'off',
    // 적용 할 수 있도록 해야한다
    'unicorn/prefer-module': 'off',
    // 적용 할 수 있도록 해야한다
    'unicorn/prefer-node-protocol': 'off',
    'unicorn/prefer-ternary': 'off',
    'unicorn/prevent-abbreviations': 'off',
    'vue/component-name-in-template-casing': ['warn', 'kebab-case'],
    'vue/order-in-components': 'off',
    'vue/require-default-prop': 'off',
    'vue/return-in-computed-property': 'off',
    'wrap-iife': 'error',
    'yield-star-spacing': ['error', 'before'],
    yoda: 'error',
  },
  settings: {
    'import/parsers': {'@typescript-eslint/parser': ['.ts', '.tsx', 'vue']},
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: [
          'packages/*/tsconfig.json',
        ],
      },
    },
  },
}
