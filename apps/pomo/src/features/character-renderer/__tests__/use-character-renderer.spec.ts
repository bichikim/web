import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {
  type CharacterRendererController,
  type CharacterRendererRuntime,
  useCharacterRenderer,
} from '../index'

interface CharacterRendererTestRoot {
  readonly controller: CharacterRendererController
  readonly dispose: () => void
}

const createRuntime = () =>
  ({
    createObjectUrl: vi.fn((_file: File) => 'blob:character'),
    revokeObjectUrl: vi.fn((_url: string) => undefined),
  }) satisfies CharacterRendererRuntime

const createRendererRoot = (runtime: CharacterRendererRuntime): CharacterRendererTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useCharacterRenderer({
      defaultModelName: '기본 캐릭터',
      defaultModelUrl: '/character.glb',
      runtime,
    })
  })

  return {controller, dispose: disposeRoot}
}

describe('useCharacterRenderer', () => {
  it('should expose the default model in the loading state', () => {
    const renderer = createRendererRoot(createRuntime())

    expect(renderer.controller.modelName()).toBe('기본 캐릭터')
    expect(renderer.controller.modelUrl()).toBe('/character.glb')
    expect(renderer.controller.progress()).toBe(0)
    expect(renderer.controller.status()).toBe('loading')
    renderer.dispose()
  })

  it('should report bounded loading progress, success, and failure', () => {
    const renderer = createRendererRoot(createRuntime())

    renderer.controller.handleLoadProgress(42.4)
    expect(renderer.controller.progress()).toBe(42)

    renderer.controller.handleLoadProgress(150)
    expect(renderer.controller.progress()).toBe(100)

    renderer.controller.handleLoadSuccess()
    expect(renderer.controller.progress()).toBe(100)
    expect(renderer.controller.status()).toBe('ready')

    renderer.controller.handleLoadError()
    expect(renderer.controller.status()).toBe('error')

    renderer.controller.handleLoadStart()
    expect(renderer.controller.progress()).toBe(0)
    expect(renderer.controller.status()).toBe('loading')
    renderer.dispose()
  })

  it('should own and revoke local model URLs when the model changes or the root disposes', () => {
    const runtime = createRuntime()
    const renderer = createRendererRoot(runtime)
    const firstFile = new File(['first'], 'first.glb', {type: 'model/gltf-binary'})
    const secondFile = new File(['second'], 'second.glb', {type: 'model/gltf-binary'})

    renderer.controller.loadFile(firstFile)
    renderer.controller.loadFile(secondFile)

    expect(renderer.controller.modelName()).toBe('second.glb')
    expect(renderer.controller.status()).toBe('loading')
    expect(runtime.revokeObjectUrl).toHaveBeenCalledTimes(1)
    renderer.dispose()
    expect(runtime.revokeObjectUrl).toHaveBeenCalledTimes(2)
  })

  it('should normalize external URLs and restore the default model', () => {
    const renderer = createRendererRoot(createRuntime())

    expect(renderer.controller.loadUrl('   ')).toBe(false)
    expect(renderer.controller.loadUrl(' https://example.com/hero.glb ')).toBe(true)
    expect(renderer.controller.modelName()).toBe('Blender / 외부 GLB')
    expect(renderer.controller.modelUrl()).toBe('https://example.com/hero.glb')

    renderer.controller.loadDefaultModel()
    expect(renderer.controller.modelName()).toBe('기본 캐릭터')
    expect(renderer.controller.modelUrl()).toBe('/character.glb')
    renderer.dispose()
  })
})
