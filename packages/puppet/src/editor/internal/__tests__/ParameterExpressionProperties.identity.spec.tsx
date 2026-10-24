/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {ParameterExpressionProperties} from '../ParameterExpressionProperties'

test('should keep a renamed expression card mounted with its settings open', () => {
  const [document, setDocument] = createSignal({
    ...createDemoDocument(),
    expressions: [
      {
        id: '표정 1',
        parameters: [{blend: 'overwrite' as const, parameterId: 'angle-x', value: 12}],
      },
    ],
  })
  render(() => (
    <ParameterExpressionProperties
      document={document()}
      parameterIds={['angle-x']}
      onDocumentChange={setDocument}
    />
  ))
  fireEvent.click(screen.getByText('표정 설정'))
  const name = screen.getByRole('textbox', {name: '표정 1 이름'})

  name.focus()
  fireEvent.input(name, {target: {value: '웃음'}})
  fireEvent.keyDown(name, {key: 'Enter'})

  expect(document().expressions?.map((expression) => expression.id)).toEqual(['웃음'])
  expect(screen.getByRole('textbox', {name: '웃음 이름'})).toBe(name)
  expect(name).toHaveFocus()
  expect(name.closest('details')?.open).toBe(true)
})

test('should unmount a deleted expression card instead of showing the next one in it', () => {
  const expression = (id: string) => ({
    id,
    parameters: [{blend: 'overwrite' as const, parameterId: 'angle-x', value: 12}],
  })
  const [document, setDocument] = createSignal({
    ...createDemoDocument(),
    expressions: ['A', 'B', 'C'].map(expression),
  })
  render(() => (
    <ParameterExpressionProperties
      document={document()}
      parameterIds={['angle-x']}
      onDocumentChange={setDocument}
    />
  ))
  const [first] = screen.getAllByText('표정 설정')
  fireEvent.click(first!)
  const [remove] = screen.getAllByRole('button', {name: '표정 삭제'})
  fireEvent.click(remove!)

  expect(document().expressions?.map((item) => item.id)).toEqual(['B', 'C'])
  // A second press cannot reach another expression through the deleted card.
  expect(remove!.isConnected).toBe(false)
  expect(
    screen.getAllByText('표정 설정').map((summary) => summary.closest('details')?.open),
  ).toEqual([false, false])
})
