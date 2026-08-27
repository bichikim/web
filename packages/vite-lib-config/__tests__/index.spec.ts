import path from 'node:path'
import type {ConfigEnv, UserConfig} from 'vite'
import {describe, expect, it} from 'vitest'

import {createConfig, targets} from '../index.mjs'

const configEnvironment: ConfigEnv = {
  command: 'build',
  isPreview: false,
  isSsrBuild: false,
  mode: 'test',
}

describe('createConfig', () => {
  it('should resolve entries and aliases from the provided root', () => {
    const root = '/workspace/library'
    const configFactory = createConfig({
      alias: {src: 'src'},
      entry: {feature: 'src/feature.ts'},
      packageJson: {name: '@scope/example-library'},
      root,
    })
    const config = configFactory(configEnvironment) as UserConfig

    expect(config.build?.lib).toMatchObject({
      entry: {
        feature: path.join(root, 'src/feature.ts'),
        index: path.join(root, 'src/index.ts'),
      },
      name: 'scopeExampleLibrary',
    })
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
    const config = configFactory(configEnvironment) as UserConfig
    const external = config.build?.rollupOptions?.external

    expect(external).toEqual(expect.any(Function))
    if (typeof external !== 'function') {
      throw new TypeError('Expected external to be a function')
    }

    expect(external('dependency')).toBe(true)
    expect(external('dependency/subpath')).toBe(true)
    expect(external('peer')).toBe(true)
    expect(external('manual-external/subpath')).toBe(true)
    expect(external('bundled-module')).toBe(false)
  })
})

describe('targets', () => {
  it('should expose the shared browser compatibility target', () => {
    expect(targets).toContain('chrome >= 55')
    expect(targets).toContain('not dead')
  })
})
