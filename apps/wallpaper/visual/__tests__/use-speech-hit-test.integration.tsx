import {cleanup, render} from '@solidjs/testing-library'
import {invoke, isTauri} from '@tauri-apps/api/core'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {useSpeechHitTest} from '../../src/features/speech'
import type {HitRegion} from '../../src/features/hit-test'
import {SCodexSpeech} from '../../src/components/SCodexSpeech'
import 'virtual:uno.css'

vi.mock('@tauri-apps/api/core', () => ({invoke: vi.fn(), isTauri: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should publish real layout changes, coalesce unchanged regions and release input on disposal', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  vi.mocked(invoke).mockResolvedValue(undefined)
  const onError = vi.fn()
  const [text, setText] = createSignal('한 줄')
  const [dragging, setDragging] = createSignal(false)
  const view = render(() => {
    const [element, setElement] = createSignal<HTMLElement | null>(null)
    useSpeechHitTest({dragging, element, onError})
    return (
      <main ref={setElement} class="p-9">
        <div role="listitem" class="w-60">
          <SCodexSpeech
            activity={{
              notificationId: 1,
              phase: 'working',
              receivedAt: 1,
              sessionId: 'test',
              text: text(),
              tool: null,
            }}
          />
        </div>
      </main>
    )
  })
  const regions = () =>
    vi
      .mocked(invoke)
      .mock.calls.filter(([command]) => command === 'set_widget_hit_region')
      .map(([, args]) => (args as {region: HitRegion}).region)
  await expect.poll(() => regions().length).toBe(1)
  const original = regions()[0].mask!
  expect(original.runs.length).toBeGreaterThan(0)
  setText('긴 내용\n'.repeat(12))
  await expect.poll(() => regions().length).toBe(2)
  expect(regions()[1].mask!.runs.length).toBeGreaterThan(original.runs.length)
  globalThis.dispatchEvent(new Event('resize'))
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  expect(regions()).toHaveLength(2)
  setDragging(true)
  await expect.poll(() => regions().at(-1)?.interactive).toBe(true)
  setDragging(false)
  await expect.poll(() => regions().at(-1)?.interactive).toBe(false)
  view.unmount()
  await expect.poll(() => vi.mocked(invoke).mock.lastCall?.[0]).toBe('clear_widget_hit_region')
  expect(onError).not.toHaveBeenCalled()
})
