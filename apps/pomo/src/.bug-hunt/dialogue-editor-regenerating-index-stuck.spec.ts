/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {successResult} from 'src/features/result'
import {
  createAudio,
  createClient,
  createEditorRoot,
  supertonicMocks,
} from '../features/focus-room-dialogue/__tests__/support/editor'

it('should clear regeneratingSegmentIndex when the model is invalidated during segment regeneration', async () => {
  const client = createClient([])
  supertonicMocks.createClient.mockReturnValue(client)
  const editor = createEditorRoot()
  editor.controller.setText('재생성 중 모델을 바꿀 대사')
  await editor.controller.generate()

  vi.mocked(client.generate).mockImplementationOnce(async () => {
    editor.controller.setModelId('int8')
    return successResult(createAudio())
  })

  await editor.controller.regenerateSegment(0)

  expect(editor.controller.regeneratingSegmentIndex()).toBeNull()
  editor.dispose()
})
