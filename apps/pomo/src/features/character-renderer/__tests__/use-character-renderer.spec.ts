import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {
  type CharacterRenderElement,
  type CharacterRendererController,
  type CharacterRendererRuntime,
  useCharacterRenderer,
} from '../index'

interface CharacterRendererTestRoot {
  readonly controller: CharacterRendererController
  readonly dispose: () => void
}

const createDeferred = () => {
  let resolvePromise: () => void = () => undefined
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })

  return {promise, resolve: resolvePromise}
}

class TestRenderElement implements CharacterRenderElement {
  readonly context = {
    scene: {
      traverse: vi.fn((callback: (node: {raycastAllowed?: boolean}) => void) => {
        callback(this.sceneNode)
      }),
    },
  }
  readonly listeners = new Map<string, Set<EventListener>>()
  readonly sceneNode: {raycastAllowed?: boolean} = {}

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener)
  }

  dispatch(type: string, event: Event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

const createRuntime = () =>
  ({
    createObjectUrl: vi.fn((_file: File) => 'blob:character'),
    loadEngine: vi.fn(async (): Promise<void> => undefined),
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
  it('should prepare the engine and expose the default model URL', async () => {
    const runtime = createRuntime()
    const renderer = createRendererRoot(runtime)
    const element = new TestRenderElement()

    renderer.controller.attachElement(element)
    await renderer.controller.prepare()

    expect(runtime.loadEngine).toHaveBeenCalledTimes(1)
    expect(renderer.controller.status()).toBe('loading')
    expect(renderer.controller.modelUrl()).toBe('/character.glb')
    renderer.dispose()
  })

  it('should report render progress and readiness from engine events', () => {
    const renderer = createRendererRoot(createRuntime())
    const element = new TestRenderElement()
    renderer.controller.attachElement(element)

    element.dispatch('progress', new CustomEvent('progress', {detail: {totalProgress01: 0.42}}))
    expect(renderer.controller.progress()).toBe(42)

    element.dispatch('loadfinished', new Event('loadfinished'))
    expect(renderer.controller.progress()).toBe(100)
    expect(renderer.controller.status()).toBe('ready')
    expect(element.sceneNode.raycastAllowed).toBe(false)
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
    expect(runtime.revokeObjectUrl).toHaveBeenCalledTimes(1)
    renderer.dispose()
    expect(runtime.revokeObjectUrl).toHaveBeenCalledTimes(2)
  })

  it('should normalize external URLs and restore the default model', () => {
    const renderer = createRendererRoot(createRuntime())
    const element = new TestRenderElement()
    renderer.controller.attachElement(element)

    expect(renderer.controller.loadUrl('   ')).toBe(false)
    expect(renderer.controller.loadUrl(' https://example.com/hero.glb ')).toBe(true)
    expect(renderer.controller.modelUrl()).toBe('https://example.com/hero.glb')

    renderer.controller.loadDefaultModel()
    expect(renderer.controller.modelName()).toBe('기본 캐릭터')
    expect(renderer.controller.modelUrl()).toBe('/character.glb')
    renderer.dispose()
  })

  it('should expose engine loading failures and allow a retry', async () => {
    const runtime = createRuntime()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    runtime.loadEngine.mockRejectedValueOnce(new Error('엔진 로드 실패'))
    const renderer = createRendererRoot(runtime)

    await renderer.controller.prepare()
    expect(renderer.controller.status()).toBe('error')

    await renderer.controller.prepare()
    expect(renderer.controller.status()).toBe('loading')
    expect(runtime.loadEngine).toHaveBeenCalledTimes(2)
    consoleError.mockRestore()
    renderer.dispose()
  })

  it('should reuse engine preparation while loading is in progress', async () => {
    const preparation = createDeferred()
    const runtime = createRuntime()
    runtime.loadEngine.mockImplementationOnce(() => preparation.promise)
    const renderer = createRendererRoot(runtime)

    const firstPreparation = renderer.controller.prepare()
    const secondPreparation = renderer.controller.prepare()

    expect(firstPreparation).toBe(secondPreparation)
    expect(runtime.loadEngine).toHaveBeenCalledTimes(1)
    preparation.resolve()
    await firstPreparation
    expect(renderer.controller.status()).toBe('loading')
    renderer.dispose()
  })
})
