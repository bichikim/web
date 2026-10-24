import {readdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {gzipSync} from 'node:zlib'
import {defineConfig, type Plugin} from 'vite'
import UnoCSS from 'unocss/vite'
import solidPlugin from 'vite-plugin-solid'
import unoConfig from '../../uno.config'

const folder = path.dirname(fileURLToPath(import.meta.url))
const referenceRoot = process.env.POFFO_REFERENCE_ROOT ?? '/private/tmp/poffo-cubism-reference'
const documentPath = path.resolve(
  process.env.POFFO_DOCUMENT ?? 'outputs/puppet-conversion/preview/poffo.json',
)
const archivePath =
  process.env.POFFO_CUBISM_ARCHIVE ?? '/Users/bichi/Downloads/Hiyori-Live2D-Sample (1).zip'
const output = path.resolve(
  process.env.POFFO_OUTPUT ?? 'outputs/puppet-conversion/preview/comparison.html',
)
const framework = 'virtual:cubism-framework'
const classes = {
  CubismFramework: 'live2dcubismframework',
  CubismMatrix44: 'math/cubismmatrix44',
  CubismMoc: 'model/cubismmoc',
  CubismMotion: 'motion/cubismmotion',
  CubismMotionQueueEntry: 'motion/cubismmotionqueueentry',
  CubismPhysics: 'physics/cubismphysics',
  CubismPose: 'effect/cubismpose',
  SdkRenderer: 'rendering/cubismrenderer_webgl',
  ShaderManager: 'rendering/cubismshader_webgl',
}
const sdkNames: Record<string, string> = {
  SdkRenderer: 'CubismRenderer_WebGL',
  ShaderManager: 'CubismShaderManager_WebGL',
}
const escapeScript = (value: string) => value.replace(/<\//gu, '<\\/')

const packageNotices = async (modules: string[]) => {
  const roots = [
    ...new Set(
      modules
        .filter((id) => id.includes('/node_modules/'))
        .map((id) => {
          const [name, scopedName] = id
            .slice(id.lastIndexOf('/node_modules/') + '/node_modules/'.length)
            .split('/')
          const packageName = name.startsWith('@') ? `${name}/${scopedName}` : name
          return (
            id.slice(0, id.lastIndexOf('/node_modules/') + '/node_modules/'.length) + packageName
          )
        }),
    ),
  ]
  const notices = await Promise.all(
    roots.map(async (root) => {
      const files = await readdir(root)
      const license = files.find((name) => /^licen[cs]e(?:\.md|\.txt)?$/iu.test(name))
      if (license === undefined) {
        return `${path.basename(root)}: ${await readFile(path.join(root, 'package.json'), 'utf8')}`
      }
      return `${path.basename(root)}\n${await readFile(path.join(root, license), 'utf8')}`
    }),
  )
  return notices.join('\n\n---\n\n')
}

const standalone = (): Plugin => ({
  enforce: 'pre',
  async generateBundle(_options, bundle) {
    const chunks = Object.values(bundle).filter((item) => item.type === 'chunk')
    const [chunk] = chunks
    if (
      chunks.length !== 1 ||
      chunk.imports.length > 0 ||
      chunk.dynamicImports.some((name) => name !== chunk.fileName) ||
      /\bimport\s*\(/u.test(chunk.code)
    ) {
      throw new Error(
        `단독 HTML 의존성: ${JSON.stringify(
          chunks.map(({fileName, imports, dynamicImports}) => ({
            dynamicImports,
            fileName,
            imports,
          })),
        )}`,
      )
    }
    const [core, archive, document, sdkLicense, frameworkLicense, redistributable, thirdParty] =
      await Promise.all([
        readFile(path.join(referenceRoot, 'Core/live2dcubismcore.js'), 'utf8'),
        readFile(archivePath),
        readFile(documentPath),
        readFile(path.join(referenceRoot, 'Core/LICENSE.md'), 'utf8'),
        readFile(path.join(referenceRoot, 'Framework/LICENSE.md'), 'utf8'),
        readFile(path.join(referenceRoot, 'Core/RedistributableFiles.txt'), 'utf8'),
        packageNotices(Object.keys(chunk.modules)),
      ])
    const payload = {
      archive: archive.toString('base64'),
      document: gzipSync(document).toString('base64'),
      notices: [
        'Hiyori Momose © Live2D Inc. / Original character: Kani Biimu.',
        'https://www.live2d.com/en/learn/sample/momose-hiyori/',
        sdkLicense,
        frameworkLicense,
        redistributable,
        thirdParty,
      ].join('\n\n'),
    }
    const policy = [
      "default-src 'none'",
      "script-src 'unsafe-inline' 'unsafe-eval'",
      "style-src 'unsafe-inline'",
      'img-src data: blob:',
      'font-src data:',
      "connect-src 'none'",
      'worker-src blob:',
    ].join('; ')
    const html = [
      '<!doctype html><html lang="ko"><head><meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      `<meta http-equiv="Content-Security-Policy" content="${policy}">`,
      '<title>Cubism · Poffo</title></head><body class="m-0"><div id="comparison-root"></div>',
      `<script id="comparison-data" type="application/json">${escapeScript(JSON.stringify(payload))}</script>`,
      `<script>${escapeScript(core)}</script><script>${escapeScript(chunk.code)}</script>`,
      '</body></html>',
    ].join('\n')
    await writeFile(output, html)
    console.log(`단독 HTML: ${output} (${html.length} bytes)`)
  },
  load(id) {
    if (id !== `\0${framework}`) {
      return
    }
    return Object.entries(classes)
      .map(([name, file]) => {
        const source = JSON.stringify(path.join(referenceRoot, 'Framework/src', `${file}.ts`))
        return `export {${sdkNames[name] ?? name} as ${name}} from ${source};`
      })
      .join('\n')
  },
  name: 'poffo-standalone-comparison',
  resolveId(id, importer) {
    if (id === framework) {
      return `\0${framework}`
    }
    if (id === './reference-assets.mjs' && importer?.endsWith('/reference.mjs')) {
      return path.join(folder, 'embedded-reference.mjs')
    }
    if (id === './load-setup' && importer?.endsWith('/ComparisonPage.tsx')) {
      return path.join(folder, 'embedded-setup.ts')
    }
  },
  async transform(code, id) {
    if (id !== path.join(referenceRoot, 'Framework/src/rendering/cubismshader_webgl.ts')) {
      return
    }
    const shaderRoot = path.join(referenceRoot, 'Framework/Shaders/WebGL')
    const files = (await readdir(shaderRoot)).filter((file) => /\.(?:vert|frag)$/u.test(file))
    const shaders = Object.fromEntries(
      await Promise.all(
        files.map(async (file) => [file, await readFile(path.join(shaderRoot, file), 'utf8')]),
      ),
    )
    const original = 'const response = await fetch(url);\n    return await response.text();'
    if (!code.includes(original)) {
      throw new Error('SDK 셰이더 로더가 변경되어 단독 번들을 만들 수 없습니다.')
    }
    const replacement = "return embeddedShaders[url.slice(url.lastIndexOf('/') + 1)];"
    return [
      `const embeddedShaders: Record<string, string> = ${JSON.stringify(shaders)};`,
      code.replace(original, replacement),
    ].join('\n')
  },
})

export default defineConfig({
  build: {
    lib: {entry: path.join(folder, 'standalone.tsx'), formats: ['iife'], name: 'PoffoComparison'},
    target: 'es2022',
    write: false,
  },
  plugins: [
    standalone(),
    UnoCSS({...unoConfig, configFile: false, mode: 'shadow-dom'}),
    solidPlugin(),
  ],
})
