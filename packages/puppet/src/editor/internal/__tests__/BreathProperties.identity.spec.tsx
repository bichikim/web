/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../../../player'
import {addBreathParameter} from '../breath'
import {BreathProperties} from '../BreathProperties'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [{defaultValue: 0, id: 'breath', maximum: 1, minimum: 0, name: 'Breath'}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

test('should keep an edited breath field mounted and focused', () => {
  const [document, setDocument] = createSignal(addBreathParameter(createDocument())!)
  render(() => <BreathProperties document={document()} onDocumentChange={setDocument} />)
  const peak = screen.getByRole('spinbutton', {name: '호흡 1 진폭'})

  peak.focus()
  fireEvent.input(peak, {target: {value: '0.4'}})

  expect(document().breath?.[0]?.peak).toBe(0.4)
  expect(screen.getByRole('spinbutton', {name: '호흡 1 진폭'})).toBe(peak)
  expect(peak).toHaveFocus()
})
