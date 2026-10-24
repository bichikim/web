/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import LegacyDialoguePage from '../focus-room-dialogue'

const routerMocks = vi.hoisted(() => ({navigate: vi.fn()}))

vi.mock('@solidjs/router', () => ({
  useLocation: () => ({search: '?dialogueId=saved-dialogue'}),
  useNavigate: () => routerMocks.navigate,
}))

it('should preserve the dialogue id while redirecting the legacy editor route', () => {
  render(() => <LegacyDialoguePage />)

  expect(routerMocks.navigate).toHaveBeenCalledWith('/dialogue?dialogueId=saved-dialogue', {
    replace: true,
  })
})
