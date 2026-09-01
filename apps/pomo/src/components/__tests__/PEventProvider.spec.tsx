/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

vi.mock('../../features/focus-room-dialogue/use-focus-room-dialogue-editor', () => {
  throw new Error('dialogue editor must not load with the focus-room layout')
})

it('should import without loading the dialogue editor', async () => {
  const module = await import('../PEventProvider')

  expect(module.PEventProvider).toEqual(expect.any(Function))
})
