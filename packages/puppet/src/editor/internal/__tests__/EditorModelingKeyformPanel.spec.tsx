/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../../player'
import {useParameterEditor} from '../../use-parameter-editor'
import {EditorModelingKeyformPanel} from '../EditorModelingKeyformPanel'

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
    expect(view.getByRole('button', {name: '현재 값에 키폼'})).toBeDisabled()
    expect(view.getByRole('button', {name: '선택 키폼 삭제'})).toBeDisabled()
    expect(view.getByText('물리 입력 미리보기')).toBeVisible()
    expect(onDocumentChange).not.toHaveBeenCalled()
    expect(JSON.stringify(document)).toBe(before)
  },
)

test('should open Physics controls below the selected input parameter', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  const editor = useParameterEditor({
    document,
    onDocumentChange: setDocument,
    onNotice: vi.fn(),
    selectedNodeIds: () => ['mesh-preview'],
  })
  const view = render(() => (
    <EditorModelingKeyformPanel
      document={document()}
      editor={editor}
      onDocumentChange={setDocument}
      selectedNodeIds={['mesh-preview']}
    />
  ))

  expect(view.queryByRole('group', {name: '물리'})).not.toBeInTheDocument()
  fireEvent.click(view.getByRole('button', {name: '물리 0'}))
  expect(view.getByRole('group', {name: '물리'})).toBeVisible()
  expect(view.container.querySelector('.modeling-physics-panel')).not.toBeInTheDocument()
  fireEvent.click(view.getByRole('button', {name: '물리 연결 추가'}))
  expect(document().physics?.pendulums).toHaveLength(1)
  expect(document().physics?.pendulums[0]?.inputParameterId).toBe('angle-x')
  expect(view.getByRole('button', {name: '물리 1'})).toHaveAttribute('aria-expanded', 'true')
})
