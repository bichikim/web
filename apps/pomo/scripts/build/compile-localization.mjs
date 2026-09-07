// Compiles Paraglide messages when the package prepare-build lifecycle runs.
import {compile} from '@inlang/paraglide-js'

import {PARAGLIDE_CONFIG} from '../../paraglide.config.ts'

await compile({
  emitTsDeclarations: true,
  ...PARAGLIDE_CONFIG.common,
  ...PARAGLIDE_CONFIG.web,
})
