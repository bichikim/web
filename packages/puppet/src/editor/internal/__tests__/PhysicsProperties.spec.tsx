/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {useDocumentHistory} from '../../use-document-history'
import {PhysicsProperties} from '../PhysicsProperties'

test('should add, edit, and remove a pendulum from the Physics panel', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  const view = render(() => (
    <PhysicsProperties document={document()} onDocumentChange={setDocument} />
  ))

  expect(view.getByRole('group', {name: 'Physics'})).toBeVisible()
  expect(view.getByText('Pendulum을 추가하면 parameter 움직임을 연결합니다.')).toBeVisible()

  fireEvent.click(view.getByRole('button', {name: 'Pendulum 추가'}))
  expect(document().physics?.pendulums).toHaveLength(1)
  expect(view.getByRole('button', {name: 'Pendulum 1 삭제'})).toBeEnabled()

  const gravity = view.getByRole('spinbutton', {name: 'Pendulum 1 중력'})
  fireEvent.input(gravity, {target: {value: '12'}})
  expect(document().physics?.pendulums[0]?.gravity).toBe(12)

  fireEvent.click(view.getByRole('button', {name: 'Pendulum 1 삭제'}))
  expect(document().physics).toBeUndefined()
  expect(view.getByText('Pendulum을 추가하면 parameter 움직임을 연결합니다.')).toBeVisible()
})

test('should disable Physics editing when the inspector is read-only', () => {
  const view = render(() => (
    <PhysicsProperties disabled document={createDemoDocument()} onDocumentChange={() => {}} />
  ))

  expect(view.getByRole('button', {name: 'Pendulum 추가'})).toBeDisabled()
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

  fireEvent.click(view.getByRole('button', {name: 'Pendulum 추가'}))
  const gravity = view.getByRole('spinbutton', {name: 'Pendulum 1 중력'})
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
