/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'

import type {PuppetDocument, PuppetParameter} from '../../../player/document'
import {createEmptyDocument} from '../../../player/create-empty-document'
import {PhysicsProperties} from '../PhysicsProperties'

const PHYSICS_PARAMETERS: ReadonlyArray<PuppetParameter> = [
  {defaultValue: 0, id: 'angle-x', maximum: 30, minimum: -30, name: 'Angle X'},
  {defaultValue: 0, id: 'angle-y', maximum: 30, minimum: -30, name: 'Angle Y'},
]

const createPhysicsDocument = (): PuppetDocument => ({
  ...createEmptyDocument(),
  parameters: PHYSICS_PARAMETERS,
})

const renderWithOneConnection = () => {
  const [document, setDocument] = createSignal(createPhysicsDocument())
  const view = render(() => (
    <PhysicsProperties document={document()} onDocumentChange={setDocument} />
  ))

  fireEvent.click(view.getByRole('button', {name: '물리 연결 추가'}))

  return {document, view}
}

test('should group a Physics connection under its input parameter', () => {
  const {view} = renderWithOneConnection()

  expect(view.getByRole('region', {name: 'Angle X 물리 연결'})).toHaveTextContent('연결 1개')
})

test('should update the input direction and range through the rendered selects', async () => {
  const {document, view} = renderWithOneConnection()

  fireEvent.click(view.getByText('움직임 설정'))
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
})

test('should update output mode and strength through the rendered controls', async () => {
  const {document, view} = renderWithOneConnection()

  fireEvent.click(view.getByText('움직임 설정'))
  fireEvent.keyDown(view.getByRole('button', {name: /물리 연결 1 출력 방식/}), {
    key: 'ArrowDown',
  })
  await waitFor(() => expect(screen.getByRole('option', {name: '지연·반동'})).toBeVisible())
  fireEvent.click(screen.getByRole('option', {name: '지연·반동'}))
  expect(document().physics?.pendulums[0]?.outputMode).toBe('lag')

  fireEvent.input(view.getByRole('spinbutton', {name: '물리 연결 1 물리 강도'}), {
    target: {value: '0.6'},
  })
  expect(document().physics?.pendulums[0]?.outputScale).toBe(0.6)
})
