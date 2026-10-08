/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, within} from '@solidjs/testing-library'
import {createSignal, onCleanup} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test.each(['document', 'shadow'] as const)(
  'should retain keyframe focus through consecutive moves and crossing another keyframe in %s',
  (scope) => {
    const warn = vi.spyOn(console, 'warn')
    const [document, setDocument] = createSignal(createDemoDocument())
    const host = globalThis.document.createElement('div')
    globalThis.document.body.append(host)
    const root = scope === 'shadow' ? host.attachShadow({mode: 'open'}) : host
    const container = globalThis.document.createElement('div')
    root.append(container)
    const view = render(
      () => {
        onCleanup(() => host.remove())
        return <EditorTimeline document={document()} onDocumentChange={setDocument} />
      },
      {container},
    )
    const focused = () =>
      scope === 'shadow' ? host.shadowRoot!.activeElement : globalThis.document.activeElement
    const marker = view.getByRole('button', {name: 'Angle Y 0.00초 키프레임'})
    const unchanged = view.getByRole('button', {name: 'Angle Y 2.00초 키프레임'})
    marker.focus()
    for (let frame = 0; frame < 2; frame += 1) {
      fireEvent.keyDown(marker, {composed: true, key: 'ArrowRight'})
    }
    expect(focused()).toBe(marker)
    expect(marker).toHaveAttribute('aria-label', 'Angle Y 0.08초 키프레임')
    const row = view.getByLabelText('Angle Y 트랙')
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({width: 240}))
    fireEvent(marker, new MouseEvent('pointerdown', {bubbles: true, button: 0, composed: true}))
    fireEvent(marker, new MouseEvent('pointermove', {bubbles: true, clientX: 180, composed: true}))
    fireEvent(marker, new MouseEvent('pointerup', {bubbles: true, composed: true}))
    expect(focused()).toBe(marker)
    expect(marker).toHaveAttribute('aria-label', 'Angle Y 1.50초 키프레임')
    expect(view.getByRole('button', {name: 'Angle Y 2.00초 키프레임'})).toBe(unchanged)
    const motion = document().motions[0]!
    expect(motion.tracks[0]?.keyframes.map((keyframe) => keyframe.time)).toEqual([1, 1.5, 2])
    expect(warn).not.toHaveBeenCalled()
    view.unmount()
  },
)

test('should retain the parameter row and focused marker when preceding rows are removed', () => {
  const source = createDemoDocument()
  const [document, setDocument] = createSignal({
    ...source,
    motions: source.motions.map((motion) => ({
      ...motion,
      timelineParameterIds: ['angle-x', 'angle-y'],
    })),
  })
  const view = render(() => <EditorTimeline document={document()} onDocumentChange={setDocument} />)
  const row = view.getByLabelText('Angle Y 트랙')
  const marker = within(row).getByRole('button', {name: 'Angle Y 1.00초 키프레임'})
  marker.focus()
  setDocument({
    ...document(),
    parameters: document().parameters!.filter((parameter) => parameter.id !== 'angle-x'),
  })
  expect(view.getByLabelText('Angle Y 트랙')).toBe(row)
  expect(marker).toHaveFocus()
})
