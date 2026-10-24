/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {updatePhysicsChain} from '../physics-chains'
import {PhysicsChainsSection} from '../PhysicsChainsSection'

const renderSection = () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  render(() => (
    <PhysicsChainsSection
      disabled={false}
      document={document()}
      inputParameterIds={['angle-x']}
      onDocumentChange={setDocument}
    />
  ))
  return document
}

describe('PhysicsChainsSection', () => {
  test('should add a chain for the selected parameter and lengthen a pendulum', () => {
    const document = renderSection()
    fireEvent.click(screen.getByRole('button', {name: /진자 체인 추가/}))
    fireEvent.click(screen.getByRole('button', {name: '진자 추가'}))
    fireEvent.input(screen.getByRole('spinbutton', {name: 'chain-1 진자 2 길이'}), {
      target: {value: '6'},
    })

    const [chain] = document().physics?.chains ?? []
    expect(chain?.inputs).toEqual([{axis: 'x', parameterId: 'angle-x', weight: 1}])
    expect(chain?.pendulums.map((pendulum) => pendulum.length)).toEqual([10, 6])
    expect(parseDocument(serializeDocument(document())).ok).toBe(true)
  })

  test('should add an output from the last pendulum to an unused parameter', () => {
    const document = renderSection()
    fireEvent.click(screen.getByRole('button', {name: /진자 체인 추가/}))
    fireEvent.click(screen.getByRole('button', {name: '출력 추가'}))

    expect(document().physics?.chains?.[0]?.outputs).toEqual([
      {axis: 'angle', parameterId: 'angle-y', pendulumIndex: 0, scale: 10, weight: 1},
    ])
    expect(parseDocument(serializeDocument(document())).ok).toBe(true)
  })

  test('should refuse outputs that feed their own input', () => {
    const document = renderSection()
    fireEvent.click(screen.getByRole('button', {name: /진자 체인 추가/}))
    const feedback = updatePhysicsChain(document(), 'chain-1', (chain) => ({
      ...chain,
      outputs: [{axis: 'angle', parameterId: 'angle-x', pendulumIndex: 0, scale: 1, weight: 1}],
    }))
    expect(feedback).toBeUndefined()
  })

  test('should keep gravity a direction with some length', () => {
    const document = renderSection()
    fireEvent.click(screen.getByRole('button', {name: /진자 체인 추가/}))
    fireEvent.input(screen.getByRole('spinbutton', {name: '중력 방향 X'}), {target: {value: '1'}})
    expect(document().physics?.gravity).toEqual([1, 1])
    fireEvent.input(screen.getByRole('spinbutton', {name: '중력 방향 Y'}), {target: {value: '0'}})
    expect(document().physics?.gravity).toEqual([1, 0])
    fireEvent.input(screen.getByRole('spinbutton', {name: '중력 방향 X'}), {target: {value: '0'}})
    expect(document().physics?.gravity).toEqual([1, 0])
  })
})
