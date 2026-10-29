/** @vitest-environment jsdom */
import {waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {gsap} from 'gsap'
import {Observer} from 'gsap/Observer'
import {connectStoryInput} from '../connect-story-input'

// Keep the real Observer event pipeline; control only browser frame delivery.
const frames = new Map<number, FrameRequestCallback>()
let frameId = 0
let disconnect: (() => void) | null = null

beforeEach(() => {
  frames.clear()
  frameId = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})

afterEach(() => {
  disconnect?.()
  disconnect = null
  gsap.ticker.sleep()
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

const wheel = (deltaY: number, target: HTMLElement = document.body) => {
  target.dispatchEvent(new WheelEvent('wheel', {bubbles: true, cancelable: true, deltaY}))
  const pending = [...frames.values()]
  frames.clear()
  for (const callback of pending) {
    callback(0)
  }
}

const setup = async (initial = -1) => {
  let chapter = initial
  let transitioning = false
  const stage = document.createElement('div')
  document.body.append(stage)
  const request = vi.fn((destination: number) => {
    chapter = destination
    transitioning = true
  })
  disconnect = connectStoryInput({
    chapter: () => chapter,
    request,
    target: stage,
    transitioning: () => transitioning,
  })
  await waitFor(() => expect(Observer.getAll()).toHaveLength(1))
  const complete = () => {
    transitioning = false
  }
  return {complete, request, stage}
}

test('should traverse every chapter with continuous wheel input and no pointer movement', async () => {
  const input = await setup()
  for (const chapter of [0, 1, 2, 3, 4, 5]) {
    wheel(120)
    expect(input.request).toHaveBeenLastCalledWith(chapter)
    expect(input.request).toHaveBeenCalledTimes(chapter + 1)
    wheel(120)
    wheel(-120)
    expect(input.request).toHaveBeenCalledTimes(chapter + 1)
    input.complete()
  }
  wheel(120)
  expect(input.request).toHaveBeenCalledTimes(6)
  for (const chapter of [4, 3, 2, 1, 0, -1]) {
    wheel(-120)
    expect(input.request).toHaveBeenLastCalledWith(chapter)
    input.complete()
  }
  expect(input.request).toHaveBeenCalledTimes(12)
})

test('should retain nested control scrolling while accepting wheel input over the character', async () => {
  const input = await setup()
  const character = document.createElement('button')
  character.setAttribute('data-character-drag', '')
  const canvas = document.createElement('canvas')
  character.append(canvas)
  input.stage.append(character)
  const popover = document.createElement('section')
  popover.setAttribute('popover', 'auto')
  input.stage.append(popover)
  wheel(120, popover)
  expect(input.request).not.toHaveBeenCalled()
  wheel(120, canvas)
  expect(input.request).toHaveBeenCalledExactlyOnceWith(0)
  input.complete()
  wheel(120, canvas)
  expect(input.request).toHaveBeenLastCalledWith(1)
})
