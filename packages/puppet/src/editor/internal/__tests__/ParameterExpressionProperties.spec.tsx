/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {
  createDemoDocument,
  parseDocument,
  type PuppetExpression,
  serializeDocument,
} from '../../../player'
import {ParameterExpressionProperties} from '../ParameterExpressionProperties'

const choose = async (label: RegExp, option: string) => {
  fireEvent.keyDown(screen.getByRole('button', {name: label}), {key: 'ArrowDown'})
  fireEvent.click(await screen.findByRole('option', {name: option}))
}

const smile: PuppetExpression = {
  id: '표정 1',
  parameters: [{blend: 'overwrite', parameterId: 'angle-x', value: 12}],
}

const renderExpressions = (expressions?: ReadonlyArray<PuppetExpression>) => {
  const [document, setDocument] = createSignal({...createDemoDocument(), expressions})
  render(() => (
    <ParameterExpressionProperties
      document={document()}
      parameterIds={['angle-x']}
      parameterValues={{'angle-x': 12}}
      onDocumentChange={setDocument}
    />
  ))
  return document
}

describe('ParameterExpressionProperties', () => {
  test('should add the current value to a new expression', () => {
    const document = renderExpressions()

    expect(screen.getByText('이 파라미터를 바꾸는 표정이 없습니다.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', {name: '표정에 추가'}))
    expect(document().expressions).toEqual([smile])
  })

  test('should start a changed blend from its identity value', async () => {
    const document = renderExpressions([smile])

    await choose(/표정 1 적용 방식/, '더하기')
    expect(document().expressions?.[0]?.parameters[0]).toEqual({
      blend: 'add',
      parameterId: 'angle-x',
      value: 0,
    })
  })

  test('should edit the value and fade times', () => {
    const document = renderExpressions([smile])

    fireEvent.input(screen.getByRole('spinbutton', {name: '표정 1 값'}), {target: {value: '5'}})
    fireEvent.input(screen.getByRole('spinbutton', {name: '표정 1 페이드 인(초)'}), {
      target: {value: '0.3'},
    })
    expect(document().expressions?.[0]).toMatchObject({
      fadeInTime: 0.3,
      parameters: [{blend: 'overwrite', parameterId: 'angle-x', value: 5}],
    })
    expect(parseDocument(serializeDocument(document())).ok).toBe(true)
  })

  test('should exclude the parameter from an expression', () => {
    const document = renderExpressions([smile])

    fireEvent.click(screen.getByRole('button', {name: /^표정 1에서 .+ 제외$/}))
    expect(document().expressions).toEqual([{id: '표정 1', parameters: []}])
  })

  test('should add the parameter to an existing expression', async () => {
    const document = renderExpressions([{id: '표정 1', parameters: []}])

    await choose(/추가할 표정/, '표정 1')
    fireEvent.click(screen.getByRole('button', {name: '표정에 추가'}))
    expect(document().expressions).toEqual([smile])
  })

  test('should delete an expression from its settings', () => {
    const document = renderExpressions([smile])

    fireEvent.click(screen.getByRole('button', {name: '표정 삭제'}))
    expect(document().expressions).toBeUndefined()
  })
})
