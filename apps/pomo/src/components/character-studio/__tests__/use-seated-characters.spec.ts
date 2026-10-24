/** @vitest-environment jsdom */
import {AssetContainer} from '@babylonjs/core/assetContainer'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {Scene} from '@babylonjs/core/scene'
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {useSeatedCharacters} from '../use-seated-characters'

vi.mock('@babylonjs/core/Loading/sceneLoader', () => ({LoadAssetContainerAsync: vi.fn()}))
vi.mock('../../../features/client-error-reporter', () => ({reportClientError: vi.fn()}))

it('should release a loaded container when attaching it fails', async () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const container = new AssetContainer(scene)
  vi.spyOn(container, 'addAllToScene').mockImplementation(() => {
    throw new Error('attach failed')
  })
  const dispose = vi.spyOn(container, 'dispose')
  vi.mocked(LoadAssetContainerAsync).mockReset().mockResolvedValueOnce(container)
  const error = vi.fn()
  const {cleanup} = renderHook(() =>
    useSeatedCharacters(scene, {
      modelUrl: 'luna',
      onLoadError: error,
      onLoadStart: vi.fn(),
      onLoadSuccess: vi.fn(),
      seatedCharacters: ['luna'],
    }),
  )
  await vi.waitFor(() => expect(error).toHaveBeenCalledOnce())
  expect(dispose).toHaveBeenCalledOnce()
  cleanup()
  expect(dispose).toHaveBeenCalledOnce()
  scene.dispose()
  engine.dispose()
})

it('should keep both occupants loaded when selecting another expression target', async () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const first = new AssetContainer(scene)
  const second = new AssetContainer(scene)
  const firstDispose = vi.spyOn(first, 'dispose')
  const secondDispose = vi.spyOn(second, 'dispose')
  vi.mocked(LoadAssetContainerAsync)
    .mockReset()
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(second)
  const success = vi.fn()
  const [selected, setSelected] = createSignal('haru')
  const {cleanup} = renderHook(() =>
    useSeatedCharacters(scene, {
      get modelUrl() {
        return selected()
      },
      onLoadError: vi.fn(),
      onLoadStart: vi.fn(),
      onLoadSuccess: success,
      seatedCharacters: ['haru', 'luna'],
    }),
  )
  await vi.waitFor(() => expect(success).toHaveBeenCalledOnce())
  setSelected('luna')
  expect(LoadAssetContainerAsync).toHaveBeenCalledTimes(2)
  expect(firstDispose).not.toHaveBeenCalled()
  expect(secondDispose).not.toHaveBeenCalled()
  cleanup()
  expect(firstDispose).toHaveBeenCalledOnce()
  expect(secondDispose).toHaveBeenCalledOnce()
  scene.dispose()
  engine.dispose()
})
