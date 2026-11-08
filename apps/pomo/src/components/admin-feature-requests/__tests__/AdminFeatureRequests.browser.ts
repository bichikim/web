import {cleanup, render} from '@solidjs/testing-library'
import {MemoryRouter, query} from '@solidjs/router'
import {createComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as m from '@paraglide/message'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import type {FeatureRequest} from 'src/features/feature-requests/types'
import {AdminFeatureRequests} from '../AdminFeatureRequests'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
const originalLocale = getLocale
const PAGE_SIZE = 20
const TOTAL_REQUESTS = 21
const UUID_DIGITS = 12
const MINUTE_MILLISECONDS = 60_000

beforeEach(() => {
  query.clear()
  overwriteGetLocale(() => 'ko')
})

afterEach(() => {
  cleanup()
  query.clear()
  overwriteGetLocale(originalLocale)
  vi.unstubAllGlobals()
})

it('should keep loaded forms and reveal request 21 after a status save and load more', async () => {
  let rows: ReadonlyArray<FeatureRequest> = Array.from({length: TOTAL_REQUESTS}, (_, index) => ({
    createdAt: new Date(
      Date.parse('2026-11-01T00:00:00.000Z') - index * MINUTE_MILLISECONDS,
    ).toISOString(),
    description: '정상 기능 요청',
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(UUID_DIGITS, '0')}`,
    status: 'requested',
    targetVoteCount: null,
    title: `요청 ${index + 1}`,
    voteCount: 0,
    votedByCurrentUser: false,
  }))
  const reads: Array<number> = []
  const writes: Array<unknown> = []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.origin)
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body))
      writes.push(body)
      rows = rows.map((row) => (url.pathname.includes(row.id) ? {...row, ...body} : row))
      return Response.json({status: 'updated'})
    }
    const offset = Number(url.searchParams.get('offset') ?? 0)
    reads.push(offset)
    const ordered = rows.toSorted(
      (left, right) =>
        Number(left.status === 'completed') - Number(right.status === 'completed') ||
        right.createdAt.localeCompare(left.createdAt),
    )
    return Response.json({
      hasMore: ordered.length > offset + PAGE_SIZE,
      requests: ordered.slice(offset, offset + PAGE_SIZE),
    })
  })
  render(() => createComponent(MemoryRouter, {root: AdminFeatureRequests}))
  await expect.element(page.getByRole('heading', {exact: true, name: '요청 20'})).toBeVisible()
  const first = page.getByRole('article').nth(0)
  const firstNode = first.element()
  await first.getByRole('button', {name: m.feature_request_status_completed()}).click()
  await first.getByRole('button', {name: m.admin_feature_request_approve()}).click()
  await expect
    .element(first.getByRole('button', {name: m.admin_feature_request_save()}))
    .toBeEnabled()
  expect(writes).toEqual([{status: 'completed', targetVoteCount: null}])
  expect(reads).toEqual([0])
  expect(page.getByRole('article').elements()).toHaveLength(PAGE_SIZE)
  await page.getByRole('button', {name: m.feature_request_load_more()}).click()
  await expect.element(page.getByRole('heading', {exact: true, name: '요청 21'})).toBeVisible()
  expect(page.getByRole('article').elements()).toHaveLength(TOTAL_REQUESTS)
  expect(page.getByRole('article').nth(0).element()).toBe(firstNode)
})
