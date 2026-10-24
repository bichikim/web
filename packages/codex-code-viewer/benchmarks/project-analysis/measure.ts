import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {z} from 'zod'
import typescript from '@typescript/typescript6'
import {readDirectory} from '../../src/server/read-directory'
import {fileFormat} from '../../src/shared/file-formats'
import {createReferenceExperiment} from './create-reference-experiment'
const NANOSECONDS_PER_MILLISECOND = 1_000_000
const KIBIBYTES_PER_MEBIBYTE = 1024
const BYTES_PER_MEBIBYTE = 1_048_576

const [root, target, needle, mode] = z
  .tuple([z.string(), z.string(), z.string(), z.enum(['unified', 'split', 'split-release'])])
  .parse(process.argv.slice(2))
const started = process.hrtime.bigint()
const listing = await readDirectory(resolve(root))
if (listing.truncated) {
  throw new Error('Incomplete file discovery')
}
const files = listing.files
  .filter((file) => fileFormat(file.path)?.kind === 'code')
  .map((file) => resolve(root, file.path))
const discovery = Number(process.hrtime.bigint() - started) / NANOSECONDS_PER_MILLISECOND
const file = resolve(root, target)
const source = readFileSync(file, 'utf8')
const offset = source.indexOf(needle)
if (offset < 0) {
  throw new Error(`Missing query: ${needle}`)
}
const preparation = process.hrtime.bigint()
const experiment = createReferenceExperiment({
  file,
  files,
  mode,
  offset,
  receive: (progress) => console.error(JSON.stringify(progress)),
  root: resolve(root),
})
const partition = Number(process.hrtime.bigint() - preparation) / NANOSECONDS_PER_MILLISECOND
try {
  for (const phase of ['cold', 'repeat'] as const) {
    // oxlint-disable-next-line no-await-in-loop -- Repeat on the retained analyzer contexts after the cold query.
    const result = await experiment.scan()
    console.log(
      JSON.stringify({
        ...result,
        discovery,
        files: files.length,
        mode,
        partition,
        peakRssMiB: process.resourceUsage().maxRSS / KIBIBYTES_PER_MEBIBYTE,
        phase,
        rssMiB: process.memoryUsage().rss / BYTES_PER_MEBIBYTE,
        typescript: typescript.version,
      }),
    )
  }
} finally {
  experiment.dispose()
}
