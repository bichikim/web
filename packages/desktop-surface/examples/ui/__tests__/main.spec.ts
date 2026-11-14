/** @vitest-environment jsdom */
import flushPromises from 'flush-promises'
import {afterEach, expect, it, vi} from 'vitest'

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetModules()
  document.body.innerHTML = ''
})

it('should wait for the website probe installation marker before forwarding pointer events', async () => {
  vi.useFakeTimers()
  document.body.innerHTML = `
    <output id="status"></output><button id="background-click"></button>
    <button id="enter"></button><button id="widget"></button><button id="restore"></button>`
  const initial = Promise.withResolvers<string>()
  const ready = Promise.withResolvers<string>()
  const completed = Promise.withResolvers<string>()
  const reads = [initial.promise, ready.promise, completed.promise]
  const invoke = vi.fn(async (command: string) => {
    if (command === 'harness_mode') {
      return {events: false, smoke: false}
    }
    if (command === 'read_website_event_probe') {
      return reads.shift()
    }
  })
  vi.stubGlobal('__TAURI__', {core: {invoke}})
  await import('../main.js')
  document.querySelector<HTMLButtonElement>('#enter')!.click()
  await flushPromises()
  initial.resolve('')
  await flushPromises()
  expect(
    invoke.mock.calls.some(([command]) => command.endsWith('forward_background_mouse_event')),
  ).toBe(false)
  await vi.advanceTimersToNextTimerAsync()
  ready.resolve('probe:')
  await flushPromises()
  expect(
    invoke.mock.calls.some(([command]) => command.endsWith('forward_background_mouse_event')),
  ).toBe(true)
})
