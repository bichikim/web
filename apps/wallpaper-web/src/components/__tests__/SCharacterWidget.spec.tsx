/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createEffect, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {useWidgetPreview} from '../../features/widget-preview'
import {SCharacterWidget} from '../SCharacterWidget'
import type {StoryCharacter} from '../../features/desktop-story/frame'
import type SPuppetCharacter from '../SPuppetCharacter'

const renderer = vi.hoisted(() => ({
  expressionChanges: vi.fn(),
  motionChanges: vi.fn(),
  props: null as Parameters<typeof SPuppetCharacter>[0] | null,
}))
vi.mock('@solidjs/start', () => ({
  clientOnly: () => (props: Parameters<typeof SPuppetCharacter>[0]) => {
    renderer.props = props
    createEffect(() => renderer.expressionChanges(props.expressionId))
    createEffect(() => renderer.motionChanges(props.motionId))
    return null
  },
}))

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn().mockImplementation(function observer() {
      return {disconnect: vi.fn(), observe: vi.fn()}
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('should release an active drag, override playback and restore all user choices after the story', () => {
  const preview = useWidgetPreview()
  preview.activate()
  preview.finish()
  preview.activate()
  preview.selectExpression('손하트')
  preview.toggleWalking()
  preview.activate()
  const [presentation, setPresentation] = createSignal<StoryCharacter>()
  render(() => <SCharacterWidget preview={preview} presentation={presentation()} />)
  const button = screen.getByRole('button', {name: '흰 고양이 위젯. 드래그해서 이동'})
  button.setPointerCapture = vi.fn()
  button.hasPointerCapture = vi.fn(() => true)
  button.releasePointerCapture = vi.fn()
  const press = new MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX: 30,
    clientY: 50,
  })
  Object.defineProperty(press, 'pointerId', {value: 4})
  const focus = vi.spyOn(button, 'focus')
  fireEvent(button, press)
  expect(press.defaultPrevented).toBe(true)
  expect(focus).toHaveBeenCalledExactlyOnceWith({preventScroll: true})
  expect(preview.dragging()).toBe(true)
  setPresentation({expressionId: null, motionId: 'Idle:0', scale: 1, x: 100, y: 120})
  expect(button.hasAttribute('disabled')).toBe(true)
  expect(preview.dragging()).toBe(false)
  expect(button.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(4)
  expect(renderer.props).toMatchObject({
    expressionId: null,
    motionId: 'Idle:0',
    playing: true,
    tracking: true,
  })
  renderer.expressionChanges.mockClear()
  renderer.motionChanges.mockClear()
  setPresentation({...presentation()!, x: 160})
  expect(renderer.expressionChanges).not.toHaveBeenCalled()
  expect(renderer.motionChanges).not.toHaveBeenCalled()
  setPresentation({...presentation()!, expressionId: '작아지기'})
  expect(renderer.props?.expressionId).toBe('작아지기')
  setPresentation(undefined)
  expect(button.hasAttribute('disabled')).toBe(false)
  expect(renderer.props).toMatchObject({
    expressionId: '손하트',
    motionId: 'Walk:0',
    playing: false,
    tracking: true,
  })
  expect(preview.expressionId()).toBe('손하트')
  expect(preview.walking()).toBe(true)
})

test('should track the pointer during introductions without overwriting a disabled user preference', () => {
  const preview = useWidgetPreview()
  preview.activate()
  preview.toggleTracking()
  const [presentation, setPresentation] = createSignal<StoryCharacter>()
  render(() => <SCharacterWidget preview={preview} presentation={presentation()} />)
  expect(renderer.props?.tracking).toBe(false)
  setPresentation({expressionId: null, motionId: 'Idle:0', scale: 1, x: 100, y: 120})
  expect(renderer.props?.tracking).toBe(true)
  expect(preview.tracking()).toBe(false)
  setPresentation(undefined)
  expect(renderer.props?.tracking).toBe(false)
})

test('should retain speech mouth poses while story presentation owns character placement', () => {
  const preview = useWidgetPreview()
  preview.activate()
  const [mouth, setMouth] = createSignal<{open: number; form: number} | null>({
    form: 0.2,
    open: 0.7,
  })
  render(() => (
    <SCharacterWidget
      preview={preview}
      mouth={mouth()}
      presentation={{expressionId: null, motionId: 'Idle:0', scale: 1, x: 100, y: 120}}
    />
  ))
  expect(renderer.props?.mouth).toEqual({form: 0.2, open: 0.7})
  setMouth(null)
  expect(renderer.props?.mouth).toBeNull()
})
