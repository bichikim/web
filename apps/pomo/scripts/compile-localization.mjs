import {compile} from '@inlang/paraglide-js'

import {
  PARAGLIDE_OUTDIR,
  PARAGLIDE_OUTPUT_STRUCTURE,
  PARAGLIDE_PROJECT,
  PARAGLIDE_ROUTE_STRATEGIES,
  PARAGLIDE_TRAILING_SLASH,
  PARAGLIDE_URL_PATTERNS,
  PARAGLIDE_WEB_STRATEGY,
} from '../paraglide.config.ts'

await compile({
  emitTsDeclarations: true,
  outdir: PARAGLIDE_OUTDIR,
  outputStructure: PARAGLIDE_OUTPUT_STRUCTURE,
  project: PARAGLIDE_PROJECT,
  routeStrategies: PARAGLIDE_ROUTE_STRATEGIES,
  strategy: PARAGLIDE_WEB_STRATEGY,
  trailingSlash: PARAGLIDE_TRAILING_SLASH,
  urlPatterns: PARAGLIDE_URL_PATTERNS,
})
