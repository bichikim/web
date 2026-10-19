/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'

import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from '../../../player'
import {addLookParameter} from '../look'
import {LookProperties} from '../LookProperties'

const createDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameters: [{defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30, name: 'Face X'}],
  parts: [],
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: 1, width: 1},
})

test('should keep an edited look field mounted and focused', () => {
  const [document, setDocument] = createSignal(addLookParameter(createDocument())!)
  render(() => <LookProperties document={document()} onDocumentChange={setDocument} />)
  const x = screen.getByRole('spinbutton', {name: '시선 1 X 계수'})

  x.focus()
  fireEvent.input(x, {target: {value: '12'}})

  expect(document().look?.[0]?.x).toBe(12)
  expect(screen.getByRole('spinbutton', {name: '시선 1 X 계수'})).toBe(x)
  expect(x).toHaveFocus()
})
