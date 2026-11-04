import path from 'node:path'
import {type ConfigEnv, mergeConfig} from 'vite'
import {describe, expect, it} from 'vitest'

import {createConfig, targets} from '@winter-love/vite-lib-config'

const configEnvironment: ConfigEnv = {
  command: 'build',
  isPreview: false,
  isSsrBuild: false,
  mode: 'test',
}

describe('createConfig', () => {
  it.each(['/workspace/library', 'packages/library'])(
    'should resolve entries and aliases from root %s',
    (root) => {
      const resolvedRoot = path.resolve(root)
      const configFactory = createConfig({
        alias: {src: 'src'},
        entry: {feature: 'src/feature.ts'},
        packageJson: {name: '@scope/example-library'},
        root,
      })
      const config = configFactory(configEnvironment)

      expect(config.root).toBe(resolvedRoot)
      expect(config.build?.lib).toMatchObject({
        entry: {
          feature: path.join(resolvedRoot, 'src/feature.ts'),
          index: path.join(resolvedRoot, 'src/index.ts'),
        },
        name: 'scopeExampleLibrary',
      })
      expect(config.resolve?.alias).toEqual({src: path.join(resolvedRoot, 'src')})
    },
  )

  it('should preserve the omitted-root paths and Vite cwd default', () => {
    const config = createConfig({packageJson: {name: 'library'}})(configEnvironment)

    expect(config.root).toBeUndefined()
    expect(config.build?.lib).toMatchObject({
      entry: {index: path.join(process.cwd(), 'src/index.ts')},
    })
  })

  it('should allow callers to override Vite root without changing entries or aliases', () => {
    const root = '/workspace/library'
    const config = mergeConfig(
      createConfig({alias: {src: 'src'}, packageJson: {name: 'library'}, root})(configEnvironment),
      {root: '/workspace/caller'},
    )

    expect(config.root).toBe('/workspace/caller')
    expect(config.build?.lib).toMatchObject({entry: {index: path.join(root, 'src/index.ts')}})
    expect(config.resolve?.alias).toEqual({src: path.join(root, 'src')})
  })

  it('should externalize package dependencies, peer dependencies, and explicit modules', () => {
    const configFactory = createConfig({
      external: ['manual-external'],
      packageJson: {
        dependencies: {dependency: '1.0.0'},
        name: 'library',
        peerDependencies: {peer: '1.0.0'},
      },
      root: '/workspace/library',
    })
    const config = configFactory(configEnvironment)
    const external = config.build?.rollupOptions?.external

    expect(external).toEqual(expect.any(Function))
    if (typeof external !== 'function') {
      throw new TypeError('Expected external to be a function')
    }

    expect(external('dependency', undefined, false)).toBe(true)
    expect(external('dependency/subpath', undefined, false)).toBe(true)
    expect(external('peer', undefined, false)).toBe(true)
    expect(external('manual-external/subpath', undefined, false)).toBe(true)
    expect(external('bundled-module', undefined, false)).toBe(false)
  })
})

describe('targets', () => {
  it('should expose the shared browser compatibility target', () => {
    expect(targets).toContain('chrome >= 55')
    expect(targets).toContain('not dead')
  })
})
