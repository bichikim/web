/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {sendSemanticInput, subscribeSemanticReady} from '../channel'
import {useSemanticInput} from '../use-semantic-input'

vi.mock('../channel', () => ({
  sendSemanticInput: vi.fn().mockResolvedValue(undefined),
  subscribeSemanticReady: vi.fn().mockResolvedValue(vi.fn()),
}))
let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  vi.clearAllMocks()
})
it('should avoid overwriting semantic tests when chat status updates retain the same text', async () => {
  const input = createRoot((cleanup) => {
    dispose = cleanup
    const [activity, setActivity] = createSignal({text: '기쁘고 행복해!', tool: 'Bash'})
    useSemanticInput({text: () => activity().text, widgetId: () => 'widget'})
    return {setActivity}
  })
  await Promise.resolve()
  const delivered = vi.mocked(sendSemanticInput).mock.calls.length
  expect(sendSemanticInput).toHaveBeenLastCalledWith({text: '기쁘고 행복해!', widgetId: 'widget'})
  input.setActivity({text: '기쁘고 행복해!', tool: 'Read'})
  expect(vi.mocked(sendSemanticInput).mock.calls.length).toBe(delivered)
  input.setActivity({text: '다음 문장이에요.', tool: 'Read'})
  expect(sendSemanticInput).toHaveBeenLastCalledWith({text: '다음 문장이에요.', widgetId: 'widget'})
  const ready = vi.mocked(subscribeSemanticReady).mock.calls[0][0]
  ready()
  expect(sendSemanticInput).toHaveBeenLastCalledWith({text: '다음 문장이에요.', widgetId: 'widget'})
})
