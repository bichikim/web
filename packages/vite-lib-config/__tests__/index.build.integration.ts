import {execFile} from 'node:child_process'
import {mkdir, mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'
import {build, mergeConfig} from 'vite'
import {afterEach, describe, expect, it} from 'vitest'
import {createConfig} from '@winter-love/vite-lib-config'

const directories: string[] = []
const execFileAsync = promisify(execFile)

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, {force: true, recursive: true})),
  )
})

const createLibrary = async (source: string) => {
  const workspace = await mkdtemp(path.join(tmpdir(), 'library-build-'))
  directories.push(workspace)
  const root = path.join(workspace, 'packages/library')
  await mkdir(path.join(root, 'src/__tests__/fixtures'), {recursive: true})
  await writeFile(
    path.join(workspace, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'ESNext',
        moduleResolution: 'bundler',
        skipLibCheck: true,
        target: 'ESNext',
      },
    }),
  )
  await writeFile(path.join(workspace, 'unrelated.ts'), 'export const unrelated: number = "wrong"')
  await writeFile(
    path.join(root, 'src/__tests__/fixtures/broken.ts'),
    'export const fixture: number = "wrong"',
  )
  await writeFile(path.join(root, 'src/view.spec.tsx'), 'export const test: number = "wrong"')
  await writeFile(path.join(root, 'src/index.ts'), source)
  const config = await createConfig({packageJson: {name: 'library'}, root})({
    command: 'build',
    mode: 'test',
  })
  return {config: mergeConfig(config, {configFile: false, logLevel: 'silent', root}), root}
}

describe('library declaration build', () => {
  it.each(['absolute', 'relative'])(
    'should emit JS and declarations under an explicit %s root from another cwd',
    async (rootKind) => {
      const {root} = await createLibrary("export {value} from './feature'\n")
      await writeFile(path.join(root, 'package.json'), JSON.stringify({name: 'library'}))
      await writeFile(path.join(root, 'src/feature.ts'), 'export const value: number = 42')
      const cwd = path.dirname(path.dirname(root))
      const script = `
      import {build, mergeConfig} from ${JSON.stringify(import.meta.resolve('vite'))}
      import {createConfig} from ${JSON.stringify(new URL('../index.mjs', import.meta.url).href)}
      const config = createConfig({
        root: ${JSON.stringify(rootKind === 'absolute' ? root : path.relative(cwd, root))},
        entry: {feature: 'src/feature.ts'},
      })({command: 'build', mode: 'test'})
      await build(mergeConfig(config, {configFile: false, logLevel: 'silent'}))
    `

      await execFileAsync(process.execPath, ['--input-type=module', '--eval', script], {cwd})

      await Promise.all(
        ['index.mjs', 'index.js', 'index.d.ts', 'feature.mjs', 'feature.js', 'feature.d.ts'].map(
          async (file) => {
            expect(await readFile(path.join(root, 'dist', file), 'utf8')).toContain('value')
          },
        ),
      )
      await expect(readdir(path.join(cwd, 'dist'))).rejects.toMatchObject({code: 'ENOENT'})
    },
  )

  it('should emit library declarations without checking sibling files or nested tests', async () => {
    const {root, config} = await createLibrary('export const value: number = 42')
    await build(config)
    expect(await readFile(path.join(root, 'dist/index.d.ts'), 'utf8')).toContain('value: number')
    expect(
      (await readdir(path.join(root, 'dist'), {recursive: true})).filter((file) =>
        file.endsWith('.d.ts'),
      ),
    ).toEqual(['index.d.ts'])
  })

  it('should reject a build when production source has a type error', async () => {
    const {config} = await createLibrary('export const value: number = "wrong"')
    await expect(build(config)).rejects.toThrow('Declaration generation failed')
  })
})
