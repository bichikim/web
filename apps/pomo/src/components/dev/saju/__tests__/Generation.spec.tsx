/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {createWorkerTransport} from 'src/utils/worker-transport'
import {Generation} from '../Generation'
import type {SajuWorkerResponse} from '../messages'

vi.mock('src/features/text-generation', () => ({supportsTextModel: () => true}))
vi.mock('src/utils/worker-transport', () => ({createWorkerTransport: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should send the displayed messages to the worker and render its completed answer', () => {
  vi.stubGlobal('Worker', class {})
  const send = vi.fn()
  let receive: ((response: SajuWorkerResponse) => void) | undefined
  vi.mocked(createWorkerTransport).mockImplementation((options) => {
    receive = options.onResponse as (response: SajuWorkerResponse) => void
    return {dispose: vi.fn(), send}
  })
  const messages = [
    {content: '명리 용어를 설명해 줘', role: 'system'},
    {content: '재물운이 궁금해요', role: 'user'},
  ] as const
  const facts = {
    birthYear: 1995,
  } as const

  render(() => <Generation facts={facts} fallbackAnswer={null} messages={messages} />)

  expect(screen.getByRole('heading', {name: '사주 풀이'})).toBeTruthy()
  expect(send).toHaveBeenCalledWith({facts, fallbackAnswer: null, messages, type: 'generate'})
  expect(screen.queryByRole('button')).toBeNull()
  receive?.({type: 'started'})
  receive?.({source: 'model', text: '재성은 한 가지 근거입니다.', type: 'complete'})

  expect(screen.getByRole('region', {name: '생성된 사주 풀이'}).textContent).toBe(
    '재성은 한 가지 근거입니다.',
  )
})
