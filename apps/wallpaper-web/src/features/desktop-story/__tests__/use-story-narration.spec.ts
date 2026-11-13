/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {resolveStoryFrame, STORY_CUTS} from '../frame'
import {useStoryNarration} from '../use-story-narration'
import chapters from '../../../data/story/chapters.json'
const overview = chapters[0]!

afterEach(cleanup)

test('should narrate the overview once after entrance and character readiness, without restarting on resize', () => {
  const [frame, setFrame] = createSignal({
    ...resolveStoryFrame({distance: 1, height: 900, width: 1440}),
    transitioning: true,
  })
  const [ready, setReady] = createSignal(false)
  const speech = {speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn()}
  renderHook(() => useStoryNarration({frame, ready, speech}))
  expect(speech.speak).not.toHaveBeenCalled()
  setFrame({...frame(), transitioning: false})
  expect(speech.speak).not.toHaveBeenCalled()
  setReady(true)
  expect(speech.speak).toHaveBeenCalledExactlyOnceWith(overview.description)
  setFrame(resolveStoryFrame({distance: 1, height: 720, width: 390}))
  expect(speech.speak).toHaveBeenCalledOnce()
  speech.stop.mockClear()
  setFrame({...frame(), transitioning: true})
  expect(speech.stop).toHaveBeenCalledOnce()
  setFrame(resolveStoryFrame({distance: 1.8, height: 720, width: 390}))
  expect(speech.speak).toHaveBeenCalledTimes(2)
  setFrame(resolveStoryFrame({distance: 1, height: 720, width: 390}))
  expect(speech.speak).toHaveBeenCalledTimes(3)
})

test('should cancel narration when the owning scene is disposed', () => {
  const frame = () => resolveStoryFrame({distance: 1, height: 900, width: 1440})
  const speech = {speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn()}
  const hook = renderHook(() => useStoryNarration({frame, ready: () => true, speech}))
  hook.cleanup()
  expect(speech.stop).toHaveBeenCalledOnce()
})

test('should narrate every introduction in both directions and leave the playground silent', () => {
  const [frame, setFrame] = createSignal(resolveStoryFrame({distance: 0, height: 900, width: 1440}))
  const speech = {speak: vi.fn().mockResolvedValue(undefined), stop: vi.fn()}
  renderHook(() => useStoryNarration({frame, ready: () => true, speech}))
  expect(speech.speak).not.toHaveBeenCalled()
  for (const cut of [...STORY_CUTS, ...STORY_CUTS.toReversed().slice(1)]) {
    const next = resolveStoryFrame({distance: cut, height: 900, width: 1440})
    setFrame({...next, transitioning: true})
    const called = speech.speak.mock.calls.length
    setFrame(next)
    const chapter = chapters[next.chapter]!
    expect(speech.speak).toHaveBeenCalledTimes(called + 1)
    expect(speech.speak).toHaveBeenLastCalledWith(chapter.description)
  }
  const called = speech.speak.mock.calls.length
  speech.stop.mockClear()
  setFrame(resolveStoryFrame({distance: 0, height: 900, width: 1440}))
  expect(speech.stop).toHaveBeenCalledOnce()
  expect(speech.speak).toHaveBeenCalledTimes(called)
})
