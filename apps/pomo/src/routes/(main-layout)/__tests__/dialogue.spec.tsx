/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'

import PDialoguePage from '../dialogue'

const routerMocks = vi.hoisted(() => ({useSearchParams: vi.fn()}))
const originalGetLocale = getLocale

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children: JSX.Element}) => <span data-testid="page-title">{props.children}</span>,
}))
vi.mock('@solidjs/router', () => ({useSearchParams: routerMocks.useSearchParams}))
vi.mock('@solidjs/start', () => ({
  clientOnly: () => (props: {dialogueId: null | string}) => (
    <span data-testid="dialogue-id">{props.dialogueId ?? 'new'}</span>
  ),
}))

beforeEach(() => {
  routerMocks.useSearchParams.mockReset()
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it.each([
  [undefined, 'Pomofi — 대화 만들기', 'new'],
  ['saved-dialogue', 'Pomofi — 대화 편집하기', 'saved-dialogue'],
])('should use the matching page title for dialogue id %s', (dialogueId, title, editorId) => {
  routerMocks.useSearchParams.mockReturnValue([{dialogueId}])

  render(() => <PDialoguePage />)

  expect(screen.getByTestId('page-title').textContent).toBe(title)
  expect(screen.getByTestId('dialogue-id').textContent).toBe(editorId)
})

it('should render the dialogue page title in English', () => {
  overwriteGetLocale(() => 'en')
  routerMocks.useSearchParams.mockReturnValue([{}])

  render(() => <PDialoguePage />)

  expect(screen.getByTestId('page-title')).toHaveTextContent('Pomofi — Create dialogue')
})
