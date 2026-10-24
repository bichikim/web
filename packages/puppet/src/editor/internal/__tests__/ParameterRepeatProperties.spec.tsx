/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {ParameterRepeatProperties} from '../ParameterRepeatProperties'

describe('ParameterRepeatProperties', () => {
  test('should turn repeat on and off for a bound parameter', () => {
    const [document, setDocument] = createSignal(createDemoDocument())
    render(() => (
      <ParameterRepeatProperties
        document={document()}
        parameterIds={['angle-x']}
        onDocumentChange={setDocument}
      />
    ))
    const angle = () => document().parameters?.find((parameter) => parameter.id === 'angle-x')

    fireEvent.click(screen.getByRole('checkbox', {name: 'Angle X 반복'}))
    expect(angle()?.repeat).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', {name: 'Angle X 반복'}))
    expect(angle()).not.toHaveProperty('repeat')
  })
})
