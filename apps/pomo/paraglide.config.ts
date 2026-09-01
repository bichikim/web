import type {CompilerOptions} from '@inlang/paraglide-js'

const PARAGLIDE_PROJECT = './.i18n/project.inlang'
const PARAGLIDE_OUTDIR = './.i18n/paraglide'

const PARAGLIDE_EXCLUDED_ROUTE_STRATEGIES = [
  {exclude: true, match: '/api/:path(.*)?'},
  {exclude: true, match: '/workers/:path(.*)?'},
] satisfies NonNullable<CompilerOptions['routeStrategies']>
// `import * as m` must not fetch one Vite module per message on the first home load.
const PARAGLIDE_OUTPUT_STRUCTURE = 'locale-modules' satisfies NonNullable<
  CompilerOptions['outputStructure']
>

const PARAGLIDE_WEB_STRATEGY = ['cookie', 'preferredLanguage', 'baseLocale'] satisfies NonNullable<
  CompilerOptions['strategy']
>

const PARAGLIDE_APPS_IN_TOSS_STRATEGY = [
  'localStorage',
  'cookie',
  'baseLocale',
] satisfies NonNullable<CompilerOptions['strategy']>

export const PARAGLIDE_CONFIG = {
  appsInToss: {
    routeStrategies: PARAGLIDE_EXCLUDED_ROUTE_STRATEGIES,
    strategy: PARAGLIDE_APPS_IN_TOSS_STRATEGY,
  },
  common: {
    outdir: PARAGLIDE_OUTDIR,
    outputStructure: PARAGLIDE_OUTPUT_STRUCTURE,
    project: PARAGLIDE_PROJECT,
  },
  web: {
    routeStrategies: PARAGLIDE_EXCLUDED_ROUTE_STRATEGIES,
    strategy: PARAGLIDE_WEB_STRATEGY,
  },
} as const
