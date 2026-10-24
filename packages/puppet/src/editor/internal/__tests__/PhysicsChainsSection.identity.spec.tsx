/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {addPhysicsChain} from '../physics-chains'
import {PhysicsChainsSection} from '../PhysicsChainsSection'

const renderSection = () => {
  const [document, setDocument] = createSignal(
    addPhysicsChain(createDemoDocument(), 'angle-x')!.document,
  )
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

describe('PhysicsChainsSection identity', () => {
  test('should keep an edited pendulum field mounted and focused', () => {
    const document = renderSection()
    const length = screen.getByRole('spinbutton', {name: 'chain-1 진자 1 길이'})

    length.focus()
    fireEvent.input(length, {target: {value: '6'}})

    expect(document().physics?.chains?.[0]?.pendulums[0]?.length).toBe(6)
    expect(screen.getByRole('spinbutton', {name: 'chain-1 진자 1 길이'})).toBe(length)
    expect(length).toHaveFocus()
  })

  test('should keep the normalization settings open while editing them', () => {
    const document = renderSection()
    fireEvent.click(screen.getByText('정규화 범위'))
    const maximum = screen.getByRole('spinbutton', {name: 'chain-1 위치 최대'})

    maximum.focus()
    fireEvent.input(maximum, {target: {value: '25'}})

    expect(document().physics?.chains?.[0]?.normalization.position.maximum).toBe(25)
    expect(screen.getByRole('spinbutton', {name: 'chain-1 위치 최대'})).toBe(maximum)
    expect(maximum).toHaveFocus()
    expect(maximum.closest('details')?.open).toBe(true)
  })
})
