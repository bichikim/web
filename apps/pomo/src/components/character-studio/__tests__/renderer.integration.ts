/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {NullEngine} from '@babylonjs/core/Engines/nullEngine'

import {readFileSync} from 'node:fs'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {createCharacterRenderer} from '../renderer'

const engines: NullEngine[] = []
const setup = () => {
  const engine = new NullEngine()
  engines.push(engine)
  const events = {
    onCloth: vi.fn(),
    onError: vi.fn(),
    onProgress: vi.fn(),
    onReady: vi.fn(),
    onStart: vi.fn(),
  }
  const loader = vi.fn<typeof LoadAssetContainerAsync>()
  const renderer = createCharacterRenderer(engine, events, loader)
  return {engine, events, loader, renderer}
}

afterEach(() => {
  engines.splice(0).forEach((engine) => engine.dispose())
})

describe('createCharacterRenderer', () => {
  it('should attach and reset cloth on the actual runtime GLB', async () => {
    const {engine, renderer, events, loader} = setup()
    const bytes = readFileSync('apps/pomo/dev-public/character-studio/pomo.glb')
    loader.mockImplementation((_source, scene, options) =>
      LoadAssetContainerAsync(bytes, scene, {
        ...options,
        pluginExtension: '.glb',
        pluginOptions: {gltf: {skipMaterials: true}},
      }),
    )
    await renderer.load('/pomo.glb')
    expect(events.onError).not.toHaveBeenCalled()
    expect(events.onCloth).toHaveBeenLastCalledWith(true)
    const mesh = engine.scenes[0].meshes.find((item) => item.name === 'Settled knit sweater')
    const original = Array.from(mesh?.getVerticesData('position') ?? [])
    expect(original.length).toBeGreaterThan(0)
    renderer.render(1 / 60, true, 1)
    expect(Array.from(mesh?.getVerticesData('position') ?? [])).not.toEqual(original)
    renderer.render(1 / 60, false, 0)
    expect(Array.from(mesh?.getVerticesData('position') ?? [])).toEqual(original)
  }, 30000)
})
