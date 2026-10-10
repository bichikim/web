/** @vitest-environment jsdom */
import {fireEvent, render, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../../player'
import {useParameterEditor} from '../../use-parameter-editor'
import {EditorModelingKeyformPanel} from '../EditorModelingKeyformPanel'
import {createOneDimensionalDocument} from './keyform-panel/fixtures'

test('should show each track influence in its own label and update unsaved influence previews', () => {
  const fixture = createOneDimensionalDocument()
  const document: PuppetDocument = {
    ...fixture.document,
    parameterBindings: fixture.document.parameterBindings?.map((binding) => ({
      ...binding,
      influences: [
        {
          parameterId: 'angle-y',
          points: [{value: 0, weight: binding.id === fixture.bindingId ? 0.25 : 0.5}],
        },
      ],
    })),
  }
  let editor: ReturnType<typeof useParameterEditor> | undefined
  const view = render(() => {
    editor = useParameterEditor({
      document: () => document,
      onDocumentChange: vi.fn(),
      onNotice: vi.fn(),
      selectedNodeIds: () => ['mesh-preview'],
    })
    return (
      <EditorModelingKeyformPanel
        document={document}
        editor={editor}
        selectedNodeIds={['mesh-preview']}
      />
    )
  })
  const paired = within(view.getByRole('group', {name: 'Angle X / Angle Y 파라미터'}))
  const single = within(view.getByRole('group', {name: 'Parameter 3 파라미터'}))
  expect(paired.getByText('적용량 50%')).toBeVisible()
  expect(single.getByText('적용량 25%')).toBeVisible()
  expect(paired.getAllByText('Angle X')).toHaveLength(1)
  expect(paired.getAllByText('Angle Y')).toHaveLength(1)
  expect(view.queryByText(/원본 키폼 편집/)).not.toBeInTheDocument()
  editor!.previewInfluences([{parameterId: 'angle-y', points: [{value: 0, weight: 0.75}]}])
  expect(paired.getByText('적용량 75%')).toBeVisible()
  expect(single.getByText('적용량 25%')).toBeVisible()
})

test.each([false, true])(
  'should keep a mixed physics binding interactive with only its input axis visible (reversed=%s)',
  (reversed) => {
    const original = createDemoDocument()
    const document: PuppetDocument = {
      ...original,
      parameterBindings: original.parameterBindings?.map((binding) =>
        reversed
          ? {
              ...binding,
              keyforms: binding.keyforms.map((keyform) => ({
                ...keyform,
                values: [keyform.values[1]!, keyform.values[0]],
              })),
              parameterIds: ['angle-y', 'angle-x'],
            }
          : binding,
      ),
      physics: {
        pendulums: [
          {
            damping: 1.2,
            gravity: 9.8,
            id: 'hair',
            inputParameterId: 'angle-x',
            inputScale: 1,
            length: 1,
            outputParameterId: 'angle-y',
            outputScale: 1,
          },
        ],
      },
    }
    const before = JSON.stringify(document)
    const onDocumentChange = vi.fn()
    const editor = useParameterEditor({
      document: () => document,
      onDocumentChange,
      onNotice: vi.fn(),
      selectedNodeIds: () => ['mesh-preview'],
    })
    const view = render(() => (
      <EditorModelingKeyformPanel
        document={document}
        editor={editor}
        selectedNodeIds={['mesh-preview']}
      />
    ))

    expect(view.getByRole('slider', {name: 'Angle X 현재 값'})).toBeVisible()
    expect(view.queryByRole('spinbutton', {name: 'Angle Y 값'})).not.toBeInTheDocument()
    expect(view.queryByRole('button', {name: 'Angle Y'})).not.toBeInTheDocument()
    expect(view.queryByLabelText('Angle X와 Angle Y 2차원 키폼 grid')).not.toBeInTheDocument()
    fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 값'}), {target: {value: '15'}})
    expect(editor.parameterValueMap()['angle-x']).toBe(15)
    expect(editor.parameterValueMap()['angle-y']).toBe(0)
    fireEvent.keyDown(view.getByRole('slider', {name: 'Angle X 현재 값'}), {key: 'End'})
    expect(editor.parameterValueMap()['angle-x']).toBe(30)
    expect(editor.parameterValueMap()['angle-y']).toBe(0)
    const track = view.getByLabelText('Angle X 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 200, 40))
    fireEvent.contextMenu(track, {clientX: 150})
    expect(view.queryByRole('menu', {name: '키폼 작업'})).not.toBeInTheDocument()
    fireEvent.dblClick(track, {clientX: 150})
    fireEvent.keyDown(track, {key: 'Backspace'})
    expect(view.getByText('물리 입력 미리보기')).toBeVisible()
    expect(onDocumentChange).not.toHaveBeenCalled()
    expect(JSON.stringify(document)).toBe(before)
  },
)

test('should insert and remove a double-clicked keyform through the document editor', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  const view = render(() => {
    const editor = useParameterEditor({
      document,
      onDocumentChange: setDocument,
      onNotice: vi.fn(),
      selectedNodeIds: () => ['mesh-preview'],
    })
    return (
      <EditorModelingKeyformPanel
        document={document()}
        editor={editor}
        selectedNodeIds={['mesh-preview']}
      />
    )
  })
  const track = view.getByLabelText('Angle X와 Angle Y 2차원 키폼 grid')
  const grid = track.querySelector('.parameter-grid')!
  vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 200, 200))
  fireEvent.dblClick(grid, {clientX: 150, clientY: 150})
  expect(document().parameterBindings?.[0]?.keyforms).toHaveLength(10)
  const marker = view.getByRole('button', {name: '키폼 선택: -15, 15'})
  expect(marker).toHaveAttribute('aria-pressed', 'true')
  fireEvent.keyDown(marker, {key: 'Backspace'})
  expect(document().parameterBindings?.[0]?.keyforms).toHaveLength(9)
  expect(view.queryByRole('button', {name: '키폼 선택: -15, 15'})).not.toBeInTheDocument()
})
