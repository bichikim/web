import type {CompilerOptions} from '@inlang/paraglide-js'

const PARAGLIDE_PROJECT = './.i18n/project.inlang'
const PARAGLIDE_OUTDIR = './.i18n/paraglide'

const PARAGLIDE_EXCLUDED_ROUTE_STRATEGIES = [
  {exclude: true, match: '/api/:path(.*)?'},
  {exclude: true, match: '/workers/:path(.*)?'},
] satisfies NonNullable<CompilerOptions['routeStrategies']>
type ParaglideOutputStructure = NonNullable<CompilerOptions['outputStructure']>
// Vite serve fetches one module per message when `import * as m` uses message-modules.
const PARAGLIDE_OUTPUT_STRUCTURE_DEVELOPMENT = 'locale-modules' satisfies ParaglideOutputStructure
// Production tree-shakes unused messages per entry with message-modules.
const PARAGLIDE_OUTPUT_STRUCTURE_PRODUCTION = 'message-modules' satisfies ParaglideOutputStructure

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
    outputStructure: PARAGLIDE_OUTPUT_STRUCTURE_PRODUCTION,
    project: PARAGLIDE_PROJECT,
  },
  development: {
    outputStructure: PARAGLIDE_OUTPUT_STRUCTURE_DEVELOPMENT,
  },
  web: {
    routeStrategies: PARAGLIDE_EXCLUDED_ROUTE_STRATEGIES,
    strategy: PARAGLIDE_WEB_STRATEGY,
  },
} as const
