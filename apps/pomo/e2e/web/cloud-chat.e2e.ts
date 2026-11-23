// oxlint-disable no-await-in-loop -- Each turn must finish before starting the next turn.
import {expect, test} from '@playwright/test'
import {
  type CloudTextRequest,
  cloudTextRequestSchema,
} from '../../src/features/cloud-text/contracts'

const FIXTURE_ORIGIN = 'http://127.0.0.1:44175'
const oldAnswer = (turn: number) => `답변 ${turn} ${'가'.repeat(7_500)}`

test('should continue cloud chat with one request for compaction and leave the transcript visible', async ({
  page,
}) => {
  const requests: CloudTextRequest[] = []
  await page.route('**/api/cloud-text', (route) => {
    const request = route.request()
    if (request.method() !== 'POST') {
      return route.fallback()
    }
    const parsed = cloudTextRequestSchema.safeParse(request.postDataJSON())
    if (!parsed.success) {
      return route.fulfill({json: {error: 'invalid_request'}, status: 400})
    }
    const turn = requests.push(parsed.data)
    const text =
      turn === 6
        ? JSON.stringify({answer: '이어서 답변', summary: '기억할 기존 대화'})
        : oldAnswer(turn)
    return route.fulfill({
      json: {
        modelId: 'test-model',
        text,
        tokenCount: 100,
        usage: {
          day: '2026-11-22',
          limit: null,
          remaining: null,
          resetsAt: '2026-11-22T15:00:00.000Z',
          used: turn,
        },
      },
    })
  })

  await page.goto(`${FIXTURE_ORIGIN}/cloud-chat`)
  await page.getByRole('button', {name: 'Prepare cloud chat'}).click()
  const input = page.getByRole('textbox', {name: 'Chat message'})
  const send = page.getByRole('button', {exact: true, name: 'Send'})
  const conversation = page.getByRole('list', {name: 'Conversation'})
  await expect(input).toBeEnabled()

  for (const turn of [1, 2, 3, 4, 5, 6, 7]) {
    await input.fill(`질문 ${turn}`)
    await send.click()
    await expect(conversation.getByRole('listitem').last()).toHaveText(
      turn === 6 ? '이어서 답변' : oldAnswer(turn),
    )
    expect(requests).toHaveLength(turn)
  }

  expect(requests[4]?.messages[1]?.content).toBe('질문 1')
  expect(requests[5]?.messages.slice(-3)).toEqual([
    {content: '질문 5', role: 'user'},
    {content: oldAnswer(5), role: 'assistant'},
    {content: '질문 6', role: 'user'},
  ])
  expect(requests[6]?.messages[0]?.content).toContain('기억할 기존 대화')
  await expect(conversation.getByRole('listitem').first()).toHaveText('질문 1')
  await expect(conversation.getByRole('listitem')).toHaveCount(14)
  await expect(conversation).not.toContainText('기억할 기존 대화')
})
