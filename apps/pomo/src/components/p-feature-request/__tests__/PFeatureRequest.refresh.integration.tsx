/** @vitest-environment jsdom */
import {MemoryRouter, query} from '@solidjs/router'
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {AuthProvider} from 'src/features/auth/AuthProvider'
import {PFeatureRequest} from '../PFeatureRequest'

const fixture = {
  createdAt: '2026-10-22T00:00:00.000Z',
  description: '목록 갱신 실패 후 복구 진단',
  id: '00000000-0000-4000-8000-000000000301',
  status: 'requested',
  targetVoteCount: null,
  title: '실제 소비자 진단 요청',
  voteCount: 0,
  votedByCurrentUser: false,
}

beforeEach(() => {
  query.clear()
  sessionStorage.clear()
  const readStyles = globalThis.getComputedStyle.bind(globalThis)
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element) => {
    const styles = readStyles(element)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
})

afterEach(() => {
  cleanup()
  query.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should expose list retry in the creation modal without sending another POST', async () => {
  let saved = false
  let allowRead = false
  const requests: Array<{readonly method: string; readonly path: string; readonly body: unknown}> =
    []
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'http://localhost')
    const method = (init?.method ?? 'GET').toUpperCase()
    requests.push({body: init?.body, method, path: url.pathname})
    if (url.pathname === '/api/account') {
      return Response.json({email: 'consumer@example.test'})
    }
    if (url.pathname !== '/api/feature-requests') {
      throw new Error(`Unexpected external request: ${method} ${url.pathname}`)
    }
    if (method === 'POST') {
      saved = true
      return Response.json({id: fixture.id}, {status: 201})
    }
    if (saved && !allowRead) {
      return Response.json({error: 'controlled unavailable list'}, {status: 503})
    }
    return Response.json({hasMore: false, requests: saved ? [fixture] : []})
  })
  vi.stubGlobal('fetch', transport)
  render(() => (
    <MemoryRouter
      root={() => (
        <AuthProvider>
          <PFeatureRequest />
        </AuthProvider>
      )}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_open()}))
  await screen.findByText(m.feature_request_empty())
  fireEvent.click(screen.getByRole('button', {name: m.feature_request_new()}))
  const title = await screen.findByRole('textbox', {name: m.feature_request_title_label()})
  fireEvent.input(title, {target: {value: fixture.title}})
  fireEvent.input(screen.getByRole('textbox', {name: m.feature_request_details_label()}), {
    target: {value: fixture.description},
  })
  fireEvent.submit((title as HTMLInputElement).form!)
  await screen.findByText(m.feature_request_created())
  expect(title).toHaveValue('')
  expect(sessionStorage.getItem('pomo:feature-request:draft:v1')).toBeNull()
  const creation = screen.getByRole('dialog', {name: m.feature_request_new()})
  expect(await within(creation).findByRole('alert')).toHaveTextContent(
    m.feature_request_list_failed(),
  )
  expect(screen.queryByText(m.feature_request_empty())).not.toBeInTheDocument()
  expect(screen.queryByRole('article', {name: fixture.title})).not.toBeInTheDocument()
  const retry = within(creation).getByRole('button', {name: m.feature_request_retry()})
  retry.focus()
  fireEvent.click(retry)
  expect(creation).toHaveFocus()
  await waitFor(() =>
    expect(within(creation).getByRole('button', {name: m.feature_request_retry()})).toBeEnabled(),
  )
  expect(within(creation).getByRole('alert')).toHaveTextContent(m.feature_request_list_failed())
  allowRead = true
  fireEvent.click(within(creation).getByRole('button', {name: m.feature_request_retry()}))
  await waitFor(() => expect(within(creation).queryByRole('alert')).not.toBeInTheDocument())
  expect(within(creation).getByRole('status')).toHaveTextContent(m.feature_request_created())
  fireEvent.click(within(creation).getByRole('button', {name: m.common_close()}))
  const card = await screen.findByRole('article', {name: fixture.title})
  expect(within(card).getByText(fixture.description)).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  const posts = requests.filter((request) => request.method === 'POST')
  expect(posts).toHaveLength(1)
  expect(JSON.parse(String(posts[0]?.body))).toEqual({
    description: fixture.description,
    title: fixture.title,
  })
})
