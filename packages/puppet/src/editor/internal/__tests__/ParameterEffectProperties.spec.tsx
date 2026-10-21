/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../../../player'
import {addBreathParameter} from '../breath'
import {BREATH_EFFECT, LOOK_EFFECT} from '../parameter-effects'
import {ParameterEffectProperties} from '../ParameterEffectProperties'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [
    {defaultValue: 0, id: 'breath', maximum: 1, minimum: 0, name: 'Breath'},
    {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30, name: 'Face X'},
  ],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

describe('ParameterEffectProperties', () => {
  test('should add, edit and delete breathing from the inspector', async () => {
    const [document, setDocument] = createSignal(createDocument())
    render(() => (
      <ParameterEffectProperties
        document={document()}
        effect={BREATH_EFFECT}
        onDocumentChange={setDocument}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: /호흡 파라미터 추가/u}))
    fireEvent.input(await screen.findByRole('spinbutton', {name: '호흡 1 진폭'}), {
      target: {value: '0.4'},
    })
    expect(document().breath).toEqual([
      {offset: 0.5, parameterId: 'breath', peak: 0.4, period: 3.5, weight: 0.5},
    ])
    fireEvent.click(screen.getByRole('button', {name: '호흡 1 삭제'}))
    expect(document()).not.toHaveProperty('breath')
  })

  test('should edit look factors from the inspector and delete entries', async () => {
    const [document, setDocument] = createSignal(createDocument())
    render(() => (
      <ParameterEffectProperties
        document={document()}
        effect={LOOK_EFFECT}
        onDocumentChange={setDocument}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: /시선 파라미터 추가/u}))
    fireEvent.input(await screen.findByRole('spinbutton', {name: '시선 1 XY 계수'}), {
      target: {value: '-30'},
    })
    expect(document().look).toEqual([{parameterId: 'breath', x: 0.5, xy: -30, y: 0}])
    fireEvent.click(screen.getByRole('button', {name: '시선 1 삭제'}))
    expect(document()).not.toHaveProperty('look')
  })

  test('should explain the effect in a tooltip instead of persistent text', () => {
    render(() => <ParameterEffectProperties document={createDocument()} effect={BREATH_EFFECT} />)
    expect(screen.getByText('자동 호흡')).toHaveAttribute('data-tooltip', BREATH_EFFECT.tooltip)
    expect(screen.queryByText(BREATH_EFFECT.tooltip)).toBeNull()
  })

  test('should move focus to the add action after deleting an entry', () => {
    const [document, setDocument] = createSignal(
      addBreathParameter(addBreathParameter(createDocument())!)!,
    )
    render(() => (
      <ParameterEffectProperties
        document={document()}
        effect={BREATH_EFFECT}
        onDocumentChange={setDocument}
      />
    ))
    const remove = screen.getByRole('button', {name: '호흡 1 삭제'})
    remove.focus()
    fireEvent.click(remove)

    expect(document().breath?.map((entry) => entry.parameterId)).toEqual(['face-x'])
    expect(screen.getByRole('button', {name: /호흡 파라미터 추가/u})).toHaveFocus()
  })
})
