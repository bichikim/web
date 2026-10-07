/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test} from 'vitest'
import {createSkinDocument} from '../../../deformation/__tests__/fixtures/skin'
import {createSkinSession, SkinSessionContext} from '../skin-session'
import {SkinningJoints} from '../SkinningJoints'

test('should render accessible joint markers and select them by pointer and keyboard', () => {
  const document = createSkinDocument()
  const session = createSkinSession()
  const view = render(() => (
    <SkinSessionContext.Provider value={session}>
      <svg>
        <SkinningJoints document={document} />
      </svg>
    </SkinSessionContext.Provider>
  ))
  const shoulder = view.getByRole('button', {name: 'Shoulder 스키닝 관절 선택'})
  const elbow = view.getByRole('button', {name: 'Elbow 스키닝 관절 선택'})

  expect(shoulder).toHaveAttribute('tabindex', '0')
  expect(shoulder).toHaveAttribute('aria-pressed', 'false')
  expect(elbow).toHaveAttribute('aria-pressed', 'false')

  fireEvent.pointerDown(elbow, {button: 0})
  expect(session.jointId()).toBe('Elbow')
  expect(elbow).toHaveAttribute('aria-pressed', 'true')
  expect(shoulder).toHaveAttribute('aria-pressed', 'false')

  fireEvent.keyDown(shoulder, {key: 'Enter'})
  expect(session.jointId()).toBe('Shoulder')
  expect(shoulder).toHaveAttribute('aria-pressed', 'true')
  expect(elbow).toHaveAttribute('aria-pressed', 'false')

  fireEvent.keyDown(elbow, {key: 'Escape'})
  expect(session.jointId()).toBe('Shoulder')
  fireEvent.keyDown(elbow, {key: ' '})
  expect(session.jointId()).toBe('Elbow')
  expect(elbow).toHaveAttribute('aria-pressed', 'true')
  view.unmount()
})
