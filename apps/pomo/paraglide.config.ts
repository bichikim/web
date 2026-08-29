import type {CompilerOptions} from '@inlang/paraglide-js'

const PARAGLIDE_PROJECT = './.i18n/project.inlang'
const PARAGLIDE_OUTDIR = './.i18n/paraglide'

const PARAGLIDE_EXCLUDED_ROUTE_STRATEGIES = [
  {exclude: true, match: '/api/:path(.*)?'},
  {exclude: true, match: '/workers/:path(.*)?'},
] satisfies NonNullable<CompilerOptions['routeStrategies']>

const PARAGLIDE_LOCALIZED_ROUTES = ['/', '/account'] as const

const PARAGLIDE_URL_PATTERNS = [
  {
    localized: [
      ['ko', ':protocol://:domain(.*)::port?/ko/:path(.*)?'],
      ['en', ':protocol://:domain(.*)::port?/en/:path(.*)?'],
    ],
    pattern: ':protocol://:domain(.*)::port?/:path(.*)?',
  },
] satisfies NonNullable<CompilerOptions['urlPatterns']>

const PARAGLIDE_TRAILING_SLASH = 'always' satisfies NonNullable<CompilerOptions['trailingSlash']>

const PARAGLIDE_OUTPUT_STRUCTURE = 'message-modules' satisfies NonNullable<
  CompilerOptions['outputStructure']
>

const PARAGLIDE_WEB_STRATEGY = ['cookie', 'preferredLanguage', 'baseLocale'] satisfies NonNullable<
  CompilerOptions['strategy']
>

const PARAGLIDE_LOCALIZED_ROUTE_STRATEGY = ['url', ...PARAGLIDE_WEB_STRATEGY] satisfies NonNullable<
  CompilerOptions['strategy']
>

const PARAGLIDE_ROUTE_STRATEGIES = [
  ...PARAGLIDE_EXCLUDED_ROUTE_STRATEGIES,
  ...PARAGLIDE_LOCALIZED_ROUTES.map((match) => ({
    match,
    strategy: PARAGLIDE_LOCALIZED_ROUTE_STRATEGY,
  })),
] satisfies NonNullable<CompilerOptions['routeStrategies']>

const PARAGLIDE_APPS_IN_TOSS_ROUTE_STRATEGIES = [
  ...PARAGLIDE_EXCLUDED_ROUTE_STRATEGIES,
  {match: '/', strategy: ['localStorage', 'cookie', 'baseLocale']},
] satisfies NonNullable<CompilerOptions['routeStrategies']>

const PARAGLIDE_APPS_IN_TOSS_STRATEGY = [
  'url',
  'localStorage',
  'cookie',
  'baseLocale',
] satisfies NonNullable<CompilerOptions['strategy']>

export const PARAGLIDE_CONFIG = {
  appsInToss: {
    routeStrategies: PARAGLIDE_APPS_IN_TOSS_ROUTE_STRATEGIES,
    strategy: PARAGLIDE_APPS_IN_TOSS_STRATEGY,
  },
  common: {
    outdir: PARAGLIDE_OUTDIR,
    outputStructure: PARAGLIDE_OUTPUT_STRUCTURE,
    project: PARAGLIDE_PROJECT,
    trailingSlash: PARAGLIDE_TRAILING_SLASH,
    urlPatterns: PARAGLIDE_URL_PATTERNS,
  },
  localizedRoutes: PARAGLIDE_LOCALIZED_ROUTES,
  web: {
    routeStrategies: PARAGLIDE_ROUTE_STRATEGIES,
    strategy: PARAGLIDE_WEB_STRATEGY,
  },
} as const
