/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {ParameterRoleProperties} from '../ParameterRoleProperties'

test('should keep the new group field mounted and focused after grouping the parameter', () => {
  const [document, setDocument] = createSignal(createDemoDocument())
  render(() => (
    <ParameterRoleProperties
      document={document()}
      parameterIds={['angle-x']}
      onDocumentChange={setDocument}
    />
  ))
  const name = screen.getByRole('textbox', {name: 'Angle X 새 그룹 이름'})

  name.focus()
  fireEvent.input(name, {target: {value: '얼굴'}})
  fireEvent.keyDown(name, {key: 'Enter'})

  const groupId = document().parameters?.find((parameter) => parameter.id === 'angle-x')?.groupId
  expect(document().parameterGroups?.find((group) => group.id === groupId)?.name).toBe('얼굴')
  expect(screen.getByRole('textbox', {name: 'Angle X 새 그룹 이름'})).toBe(name)
  expect(name).toHaveFocus()
})
