import {mkdir, mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {build, mergeConfig} from 'vite'
import {afterEach, describe, expect, it} from 'vitest'
import {createConfig} from '@winter-love/vite-lib-config'

const directories: string[] = []

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
