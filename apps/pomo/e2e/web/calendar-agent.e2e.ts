import {expect, test} from '@playwright/test'
import type {TextGenerationMessage} from '../../src/features/text-generation/runtime'

const cases = [
  {
    answer: '토요일 오후 약속',
    end: '2026-09-05T15:00:00.000Z',
    input: '내일 오전 말고 일정 알려줘',
    localEnd: '2026-09-06T00:00',
    localStart: '2026-09-05T12:00',
    start: '2026-09-05T03:00:00.000Z',
  },
  {
    answer: '다음 주말 피크닉',
    end: '2026-09-13T15:00:00.000Z',
    input: '이번 주말 말고 주말 일정 알려줘',
    localEnd: '2026-09-14T00:00',
    localStart: '2026-09-12T00:00',
    start: '2026-09-11T15:00:00.000Z',
  },
]

test.use({timezoneId: 'Asia/Seoul'})

test('should display the events in the range selected by the agent alone', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-09-04T10:30:00.000Z'))
  const sequence: string[] = []
  const lookups: URLSearchParams[] = []
  const modelRequested = Promise.withResolvers<void>()
  const releaseFirstModelReply = Promise.withResolvers<void>()
  await page.route(
    (url) => url.pathname.endsWith('/text-generation/transformers-runtime.ts'),
    (route) =>
      route.fulfill({
        body: `
          export const createTransformersRuntime = () => ({
            prepare: async () => {},
            countTokens: async () => 10,
            generate: async ({messages, outputSchema, signal}) => {
              const response = await fetch('/__e2e/calendar-model', {
                body: JSON.stringify({messages, structured: outputSchema !== undefined}),
                method: 'POST',
                signal,
              });
              return response.text();
            },
          });
        `,
        contentType: 'text/javascript',
      }),
  )
  await page.route('**/__e2e/calendar-model', async (route) => {
    const {messages, structured} = route.request().postDataJSON() as {
      readonly messages: ReadonlyArray<TextGenerationMessage>
      readonly structured: boolean
    }
    const input = messages.at(-1)?.content ?? ''
    const item = cases.find((candidate) => candidate.input === input)
    if (!structured) {
      const body =
        item === undefined
          ? '안녕하세요!'
          : messages[0]?.content.includes(item.answer) === true
            ? item.answer
            : '일정을 확인하지 못했습니다.'
      return route.fulfill({body})
    }
    sequence.push(input)
    if (item === cases[0]) {
      modelRequested.resolve()
      await releaseFirstModelReply.promise
    }
    return route.fulfill({
      json:
        item === undefined
          ? {at: '', end: '', name: 'none', start: ''}
          : {at: '', end: item.localEnd, name: 'calendar_lookup', start: item.localStart},
    })
  })
  await page.route('**/api/calendar/events?*', (route) => {
    const search = new URL(route.request().url()).searchParams
    lookups.push(search)
    const item = cases.find((candidate) => candidate.start === search.get('start'))
    if (item === undefined) {
      return route.fulfill({status: 400})
    }
    return route.fulfill({
      json: {
        connectedConnections: 1,
        events: [
          {
            accountLabel: '테스트',
            allDay: false,
            calendarLabel: '개인',
            end: new Date(Date.parse(item.start) + 3_600_000).toISOString(),
            id: item.start,
            provider: 'google',
            start: item.start,
            title: item.answer,
          },
        ],
        timeZone: 'Asia/Seoul',
        truncated: false,
        unavailableConnections: 0,
      },
    })
  })

  await page.goto('/dev/chat')
  await page.getByRole('button', {name: 'Qwen3.5-4B 준비하기'}).click()

  const input = page.getByRole('textbox', {name: '메시지'})
  await expect(input).toBeEnabled()
  const send = page.getByRole('button', {name: '보내기'})
  const sendMessage = async (message: string) => {
    await input.fill(message)
    await send.click()
  }

  await sendMessage(cases[0]!.input)
  await modelRequested.promise
  expect(lookups).toHaveLength(0)
  releaseFirstModelReply.resolve()
  await expect(page.getByRole('article').filter({hasText: cases[0]!.answer})).toBeVisible()
  await sendMessage(cases[1]!.input)
  await expect(page.getByRole('article').filter({hasText: cases[1]!.answer})).toBeVisible()
  await sendMessage('안녕')
  await expect(page.getByRole('article').filter({hasText: '안녕하세요!'})).toBeVisible()

  expect(sequence).toEqual([...cases.map((item) => item.input), '안녕'])
  expect(lookups.map((lookup) => Object.fromEntries(lookup))).toEqual(
    cases.map(({end, start}) => ({end, start, timeZone: 'Asia/Seoul'})),
  )
})
