/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {PFormMessage} from '../PFormMessage'

it('should announce errors assertively', () => {
  const result = render(() => <PFormMessage tone="error">전송하지 못했습니다.</PFormMessage>)
  const alert = result.getByRole('alert')

  expect(alert.tagName).toBe('DIV')
  expect(alert).toHaveTextContent('전송하지 못했습니다.')
})

it('should announce successful feedback politely', () => {
  const result = render(() => <PFormMessage tone="success">전송했습니다.</PFormMessage>)

  expect(result.getByRole('status')).toHaveTextContent('전송했습니다.')
})
