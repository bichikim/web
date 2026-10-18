import {cp, mkdir, readFile, writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {z} from 'zod'

interface PdfRuntimeOptions {
  readonly output: string
  readonly platform: string
  readonly architecture: string
}
const packageInfo = z.object({name: z.string(), version: z.string()})
const canvasInfo = packageInfo.extend({optionalDependencies: z.record(z.string(), z.string())})

/** Copies PDF.js's installed Node renderer and font assets for the current build host. */
export const createPdfRuntime = async (options: PdfRuntimeOptions) => {
  const pdfRoot = dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')))
  const pdfRequire = createRequire(join(pdfRoot, 'package.json'))
  const canvasManifest = pdfRequire.resolve('@napi-rs/canvas/package.json')
  const canvasRoot = dirname(canvasManifest)
  const canvas = canvasInfo.parse(JSON.parse(await readFile(canvasManifest, 'utf8')))
  const canvasRequire = createRequire(canvasManifest)
  const prefix = `@napi-rs/canvas-${options.platform}-${options.architecture}`
  const candidates = Object.keys(canvas.optionalDependencies).filter((name) =>
    name.startsWith(prefix),
  )
  const installed = candidates.flatMap((name) => {
    try {
      return [canvasRequire.resolve(`${name}/package.json`)]
    } catch {
      return []
    }
  })
  const [nativeManifest] = installed
  if (nativeManifest === undefined) {
    throw new Error(`PDF.js Node renderer is not installed for ${prefix}`)
  }
  const nativeRoot = dirname(nativeManifest)
  const native = packageInfo.parse(JSON.parse(await readFile(nativeManifest, 'utf8')))
  const license = await readFile(join(canvasRoot, 'LICENSE'), 'utf8')
  const packages = [
    {name: canvas.name, root: canvasRoot},
    {name: native.name, root: nativeRoot},
  ]
  await mkdir(join(options.output, 'node_modules', '@napi-rs'), {recursive: true})
  await Promise.all(
    packages.map((entry) =>
      cp(entry.root, join(options.output, 'node_modules', entry.name), {recursive: true}),
    ),
  )
  await writeFile(join(options.output, 'node_modules', native.name, 'LICENSE'), license)
  await mkdir(join(options.output, 'pdf-assets'), {recursive: true})
  await Promise.all(
    ['cmaps', 'standard_fonts', 'wasm'].map((directory) =>
      cp(join(pdfRoot, directory), join(options.output, 'pdf-assets', directory), {
        recursive: true,
      }),
    ),
  )
  return {
    fallbacks: {[`${native.name}@${native.version}`]: license},
    modules: [join(canvasRoot, 'index.js'), nativeManifest],
  }
}
