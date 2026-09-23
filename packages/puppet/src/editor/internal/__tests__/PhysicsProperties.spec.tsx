/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {useDocumentHistory} from '../../use-document-history'
import {PhysicsProperties} from '../PhysicsProperties'

test('should expose preview and reset independently of document editing', () => {
  const [preview, setPreview] = createSignal(true)
  const onReset = vi.fn()
  const view = render(() => (
    <PhysicsProperties
      disabled
      document={createDemoDocument()}
      physicsPreview={preview()}
      onPhysicsPreviewChange={setPreview}
      onPhysicsReset={onReset}
    />
  ))

  const toggle = view.getByRole('button', {name: '물리 미리보기'})
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(toggle)
  expect(preview()).toBe(false)
  expect(toggle).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(view.getByRole('button', {name: '물리 초기화'}))
  expect(onReset).toHaveBeenCalledOnce()
  expect(view.getByRole('button', {name: '물리 연결 추가'})).toBeDisabled()
})

test('should add, edit, and remove a pendulum from the Physics panel', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  const view = render(() => (
    <PhysicsProperties document={document()} onDocumentChange={setDocument} />
  ))

  expect(view.getByRole('group', {name: '물리'})).toBeVisible()
  expect(view.getByText('물리 연결을 추가하면 파라미터 움직임을 연결합니다.')).toBeVisible()

  fireEvent.click(view.getByRole('button', {name: '물리 연결 추가'}))
  expect(document().physics?.pendulums).toHaveLength(1)
  expect(view.getByRole('button', {name: '물리 연결 1 삭제'})).toBeEnabled()

  const gravity = view.getByRole('spinbutton', {name: '물리 연결 1 중력'})
  fireEvent.input(gravity, {target: {value: '12'}})
  expect(document().physics?.pendulums[0]?.gravity).toBe(12)

  fireEvent.click(view.getByRole('button', {name: '물리 연결 1 삭제'}))
  expect(document().physics).toBeUndefined()
  expect(view.getByText('물리 연결을 추가하면 파라미터 움직임을 연결합니다.')).toBeVisible()
})

test('should disable Physics editing when the inspector is read-only', () => {
  const view = render(() => (
    <PhysicsProperties disabled document={createDemoDocument()} onDocumentChange={() => {}} />
  ))

  expect(view.getByRole('button', {name: '물리 연결 추가'})).toBeDisabled()
})

test('should group numeric Physics edits into one undoable transaction', () => {
  const history = useDocumentHistory({initialDocument: createDemoDocument()})
  const view = render(() => (
    <PhysicsProperties
      document={history.document()}
      onDocumentChange={history.setDocument}
      onEditEnd={history.endTransaction}
      onEditStart={history.beginTransaction}
    />
  ))

  fireEvent.click(view.getByRole('button', {name: '물리 연결 추가'}))
  const gravity = view.getByRole('spinbutton', {name: '물리 연결 1 중력'})
  fireEvent.focus(gravity)
  fireEvent.input(gravity, {target: {value: '12'}})
  fireEvent.blur(gravity)

  expect(history.undoCount()).toBe(2)
  expect(history.document().physics?.pendulums[0]?.gravity).toBe(12)
  expect(history.undo()).toBe(true)
  expect(history.document().physics?.pendulums[0]?.gravity).toBe(9.8)
  expect(history.undo()).toBe(true)
  expect(history.document().physics).toBeUndefined()
})

test('should group connections by input and expose direction, range, and output strength', async () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  const view = render(() => (
    <PhysicsProperties document={document()} onDocumentChange={setDocument} />
  ))

  fireEvent.click(view.getByRole('button', {name: '물리 연결 추가'}))

  expect(view.getByRole('region', {name: 'Angle X 물리 연결'})).toHaveTextContent('연결 1개')
  fireEvent.keyDown(view.getByRole('button', {name: /물리 연결 1 입력 방향/}), {
    key: 'ArrowDown',
  })
  await waitFor(() => expect(screen.getByRole('option', {name: '반대 방향'})).toBeVisible())
  fireEvent.click(screen.getByRole('option', {name: '반대 방향'}))
  expect(document().physics?.pendulums[0]?.inputScale).toBe(-1)

  fireEvent.input(view.getByRole('spinbutton', {name: '물리 연결 1 입력 범위'}), {
    target: {value: '2'},
  })
  expect(document().physics?.pendulums[0]?.inputScale).toBe(-0.5)

  fireEvent.input(view.getByRole('spinbutton', {name: '물리 연결 1 물리 강도'}), {
    target: {value: '0.6'},
  })
  expect(document().physics?.pendulums[0]?.outputScale).toBe(0.6)
})
