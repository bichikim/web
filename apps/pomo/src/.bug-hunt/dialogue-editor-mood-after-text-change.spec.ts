/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {successResult} from 'src/features/result'
import {
  cheerfulAnalysis,
  createClient,
  createEditorRoot,
  moodAnalyzerMocks,
  supertonicMocks,
} from '../features/focus-room-dialogue/__tests__/support/editor'

it('should not restore generated audio after the script text changes during mood analysis', async () => {
  const client = createClient([])
  supertonicMocks.createClient.mockReturnValue(client)
  let resolveAnalysis: (result: ReturnType<typeof successResult>) => void = () => undefined
  moodAnalyzerMocks.analyze.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveAnalysis = resolve
      }),
  )

  const editor = createEditorRoot()
  editor.controller.setText('분위기 분석 중 대본을 바꿀 대사')
  const generating = editor.controller.generate()
  await vi.waitFor(() => expect(moodAnalyzerMocks.analyze).toHaveBeenCalledOnce())

  editor.controller.setText('바뀐 대본')
  resolveAnalysis(
    successResult({
      analysis: cheerfulAnalysis,
      elapsedMilliseconds: 1,
      status: 'complete',
    }),
  )
  await generating

  expect(editor.controller.text()).toBe('바뀐 대본')
  expect(editor.controller.segments()).toEqual([])
  expect(editor.controller.state().status).not.toBe('ready')
  editor.dispose()
})
