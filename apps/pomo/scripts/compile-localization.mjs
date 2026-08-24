import {compile} from '@inlang/paraglide-js'

import {
  PARAGLIDE_OUTPUT_STRUCTURE,
  PARAGLIDE_ROUTE_STRATEGIES,
  PARAGLIDE_TRAILING_SLASH,
  PARAGLIDE_URL_PATTERNS,
  PARAGLIDE_WEB_STRATEGY,
} from '../paraglide.config.ts'

await compile({
  emitTsDeclarations: true,
  outdir: './src/paraglide',
  outputStructure: PARAGLIDE_OUTPUT_STRUCTURE,
  project: './project.inlang',
  routeStrategies: PARAGLIDE_ROUTE_STRATEGIES,
  strategy: PARAGLIDE_WEB_STRATEGY,
  trailingSlash: PARAGLIDE_TRAILING_SLASH,
  urlPatterns: PARAGLIDE_URL_PATTERNS,
})
