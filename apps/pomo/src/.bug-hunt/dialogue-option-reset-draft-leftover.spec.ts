/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {createRuntimeOptionResetManager} from 'src/features/dev-option-reset'
import {getDialogueDraftKey} from 'src/features/focus-room-dialogue/dialogue-draft'

it('should clear focus-room dialogue drafts when dialogue options are reset', async () => {
  const draftKey = getDialogueDraftKey('dialogue-after-reset')
  sessionStorage.setItem(draftKey, '미저장 대사 초안')

  await expect(createRuntimeOptionResetManager().reset('dialogue')).resolves.toEqual({
    status: 'complete',
  })

  expect(sessionStorage.getItem(draftKey)).toBeNull()
})
