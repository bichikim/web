/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'

import type {PuppetDocument, PuppetParameter} from '../../../player/document'
import {createEmptyDocument} from '../../../player/create-empty-document'
import {useDocumentHistory} from '../../use-document-history'
import {PhysicsProperties} from '../PhysicsProperties'

const PHYSICS_PARAMETERS: ReadonlyArray<PuppetParameter> = [
  {defaultValue: 0, id: 'angle-x', maximum: 30, minimum: -30, name: 'Angle X'},
  {defaultValue: 0, id: 'angle-y', maximum: 30, minimum: -30, name: 'Angle Y'},
]

const createPhysicsDocument = (): PuppetDocument => ({
  ...createEmptyDocument(),
  parameters: PHYSICS_PARAMETERS,
})

test('should expose preview and reset independently of document editing', () => {
  const [preview, setPreview] = createSignal(true)
  const onReset = vi.fn()
  const view = render(() => (
    <PhysicsProperties
      disabled
      document={createPhysicsDocument()}
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
  const [document, setDocument] = createSignal(createPhysicsDocument())
  const view = render(() => (
    <PhysicsProperties document={document()} onDocumentChange={setDocument} />
  ))

  expect(view.getByRole('group', {name: '물리'})).toBeVisible()
  expect(view.getByText('연결된 출력 파라미터 없음')).toBeVisible()

  fireEvent.click(view.getByRole('button', {name: '물리 연결 추가'}))
  expect(document().physics?.pendulums).toHaveLength(1)
  expect(view.getByRole('button', {name: '물리 연결 1 삭제'})).toBeEnabled()
  expect(view.getByText(/→/)).toBeVisible()
  fireEvent.click(view.getByText('움직임 설정'))

  const gravity = view.getByRole('spinbutton', {name: '물리 연결 1 중력'})
  fireEvent.input(gravity, {target: {value: '12'}})
  expect(document().physics?.pendulums[0]?.gravity).toBe(12)

  fireEvent.click(view.getByRole('button', {name: '물리 연결 1 삭제'}))
  expect(document().physics).toBeUndefined()
  expect(view.getByText('연결된 출력 파라미터 없음')).toBeVisible()
})

test('should disable Physics editing when the inspector is read-only', () => {
  const view = render(() => (
    <PhysicsProperties disabled document={createPhysicsDocument()} onDocumentChange={() => {}} />
  ))

  expect(view.getByRole('button', {name: '물리 연결 추가'})).toBeDisabled()
})

test('should group numeric Physics edits into one undoable transaction', () => {
  const history = useDocumentHistory({initialDocument: createPhysicsDocument()})
  const view = render(() => (
    <PhysicsProperties
      document={history.document()}
      onDocumentChange={history.setDocument}
      onEditEnd={history.endTransaction}
      onEditStart={history.beginTransaction}
    />
  ))

  fireEvent.click(view.getByRole('button', {name: '물리 연결 추가'}))
  fireEvent.click(view.getByText('움직임 설정'))
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
