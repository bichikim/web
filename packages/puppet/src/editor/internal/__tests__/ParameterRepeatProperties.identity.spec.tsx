/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {ParameterRepeatProperties} from '../ParameterRepeatProperties'

test('should keep a toggled repeat checkbox mounted and focused', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  render(() => (
    <ParameterRepeatProperties
      document={document()}
      parameterIds={['angle-x']}
      onDocumentChange={setDocument}
    />
  ))
  const repeat = screen.getByRole('checkbox', {name: 'Angle X 반복'})

  repeat.focus()
  fireEvent.click(repeat)

  expect(document().parameters?.find((parameter) => parameter.id === 'angle-x')?.repeat).toBe(true)
  expect(screen.getByRole('checkbox', {name: 'Angle X 반복'})).toBe(repeat)
  expect(repeat).toHaveFocus()
})
