/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {RuntimeSplit} from '../RuntimeSplit'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test.each([false, true])(
  'should resize and constrain the %s studio split with arrow keys',
  (studio) => {
    render(() => <RuntimeSplit studio={studio}>Content</RuntimeSplit>)
    const divider = screen.getByRole('separator', {
      name: studio ? '모델·그래프 너비 조절' : '모델·도구 너비 조절',
    })
    const initial = Number(divider.getAttribute('aria-valuenow'))
    fireEvent.keyDown(divider, {key: 'ArrowRight'})
    expect(divider).toHaveAttribute('aria-valuenow', String(initial + 2))
    fireEvent.keyDown(divider, {key: 'ArrowLeft'})
    expect(divider).toHaveAttribute('aria-valuenow', String(initial))
    for (let index = 0; index < 30; index += 1) {
      fireEvent.keyDown(divider, {key: 'ArrowLeft'})
    }
    expect(divider).toHaveAttribute('aria-valuenow', '25')
    for (let index = 0; index < 30; index += 1) {
      fireEvent.keyDown(divider, {key: 'ArrowRight'})
    }
    expect(divider).toHaveAttribute('aria-valuenow', '75')
  },
)

test('should retain independent viewer and studio sizes across mode changes', () => {
  const [studio, setStudio] = createSignal(false)
  render(() => <RuntimeSplit studio={studio()}>Content</RuntimeSplit>)
  const divider = screen.getByRole('separator')
  fireEvent.keyDown(divider, {key: 'ArrowRight'})
  expect(divider).toHaveAttribute('aria-valuenow', '62')
  setStudio(true)
  expect(divider).toHaveAttribute('aria-valuenow', '40')
  fireEvent.keyDown(divider, {key: 'ArrowLeft'})
  expect(divider).toHaveAttribute('aria-valuenow', '38')
  setStudio(false)
  expect(divider).toHaveAttribute('aria-valuenow', '62')
  setStudio(true)
  expect(divider).toHaveAttribute('aria-valuenow', '38')
})

test('should resize only during a captured pointer drag and clamp outside the split', () => {
  const previousWidths: number[] = []
  const handleResize = () => {
    previousWidths.push(Number(screen.getByRole('separator').getAttribute('aria-valuenow')))
  }
  render(() => <RuntimeSplit onResize={handleResize}>Content</RuntimeSplit>)
  const divider = screen.getByRole('separator')
  let captured = false
  Object.assign(divider, {
    hasPointerCapture: () => captured,
    setPointerCapture: () => {
      captured = true
    },
  })
  vi.spyOn(divider.parentElement!, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({width: 400, x: 100}),
  )
  fireEvent(divider, new MouseEvent('pointermove', {bubbles: true, clientX: 400}))
  expect(divider).toHaveAttribute('aria-valuenow', '60')
  expect(previousWidths).toEqual([])
  fireEvent(divider, new MouseEvent('pointerdown', {bubbles: true, button: 2}))
  expect(captured).toBe(false)
  fireEvent(divider, new MouseEvent('pointerdown', {bubbles: true, button: 0}))
  fireEvent(divider, new MouseEvent('pointermove', {bubbles: true, clientX: 300}))
  expect(divider).toHaveAttribute('aria-valuenow', '50')
  fireEvent(divider, new MouseEvent('pointermove', {bubbles: true, clientX: -100}))
  expect(divider).toHaveAttribute('aria-valuenow', '25')
  fireEvent(divider, new MouseEvent('pointermove', {bubbles: true, clientX: 900}))
  expect(divider).toHaveAttribute('aria-valuenow', '75')
  expect(previousWidths).toEqual([60, 50, 25])
  fireEvent(divider, new MouseEvent('pointermove', {bubbles: true, clientX: 900}))
  expect(previousWidths).toEqual([60, 50, 25])
})

test('should retain a valid size when the split has no measurable width', () => {
  render(() => <RuntimeSplit>Content</RuntimeSplit>)
  const divider = screen.getByRole('separator')
  Object.assign(divider, {hasPointerCapture: () => true})
  vi.spyOn(divider.parentElement!, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect())
  fireEvent(divider, new MouseEvent('pointermove', {bubbles: true, clientX: 100}))
  expect(divider).toHaveAttribute('aria-valuenow', '60')
})
