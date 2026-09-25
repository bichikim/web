/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {useCharacterRenderer} from '../features/character-renderer'

it('should keep progress at 100 after the model is ready when late progress events arrive', () => {
  const runtime = {
    createObjectUrl: vi.fn(() => 'blob:test'),
    revokeObjectUrl: vi.fn(),
  }
  let dispose = () => undefined
  const controller = createRoot((disposeRoot) => {
    dispose = disposeRoot
    return useCharacterRenderer({
      defaultModelName: 'default',
      defaultModelUrl: '/model.glb',
      runtime,
    })
  })

  controller.handleLoadSuccess()
  controller.handleLoadProgress(42)

  expect(controller.status()).toBe('ready')
  expect(controller.progress()).toBe(100)
  dispose()
})
