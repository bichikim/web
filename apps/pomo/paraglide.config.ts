import type {CompilerOptions} from '@inlang/paraglide-js'

export const PARAGLIDE_ROUTE_STRATEGIES = [
  {exclude: true, match: '/api/:path(.*)?'},
  {exclude: true, match: '/workers/:path(.*)?'},
] satisfies NonNullable<CompilerOptions['routeStrategies']>

export const PARAGLIDE_APPS_IN_TOSS_ROUTE_STRATEGIES = [
  ...PARAGLIDE_ROUTE_STRATEGIES,
  {match: '/', strategy: ['localStorage', 'cookie', 'baseLocale']},
] satisfies NonNullable<CompilerOptions['routeStrategies']>

export const PARAGLIDE_URL_PATTERNS = [
  {
    localized: [
      ['ko', ':protocol://:domain(.*)::port?/ko/:path(.*)?'],
      ['en', ':protocol://:domain(.*)::port?/en/:path(.*)?'],
    ],
    pattern: ':protocol://:domain(.*)::port?/:path(.*)?',
  },
] satisfies NonNullable<CompilerOptions['urlPatterns']>

export const PARAGLIDE_TRAILING_SLASH = 'always' satisfies NonNullable<
  CompilerOptions['trailingSlash']
>

export const PARAGLIDE_OUTPUT_STRUCTURE = 'message-modules' satisfies NonNullable<
  CompilerOptions['outputStructure']
>

export const PARAGLIDE_WEB_STRATEGY = [
  'url',
  'cookie',
  'preferredLanguage',
  'baseLocale',
] satisfies NonNullable<CompilerOptions['strategy']>

export const PARAGLIDE_APPS_IN_TOSS_STRATEGY = [
  'url',
  'localStorage',
  'cookie',
  'baseLocale',
] satisfies NonNullable<CompilerOptions['strategy']>
