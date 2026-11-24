import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {SCodexSpeechStack} from '../../src/components/SCodexSpeechStack'
import type {useCharacterChat} from '../../src/features/conversation'
import 'virtual:uno.css'

afterEach(cleanup)

test.each(['response', 'working', 'question'] as const)(
  'should cap a long %s bubble and keep its controls outside body scrolling',
  async (phase) => {
    render(() => (
      <div class="w-80 p-12">
        <SCodexSpeechStack
          maxHeight={1800}
          wrap
          activities={[
            {
              notificationId: 1,
              phase,
              receivedAt: 1,
              response: phase === 'response' ? '긴 응답을 표시합니다.\n'.repeat(120) : undefined,
              sessionId: 'height-test',
              text: '긴 진행 내용을 표시합니다.\n'.repeat(120),
              title: '높이 확인',
              tool: null,
            },
          ]}
          questions={
            phase === 'question'
              ? [
                  {
                    id: 'height-question',
                    questions: [
                      {
                        id: 'q',
                        options: Array.from({length: 12}, (_, index) => ({
                          label: `선택 ${index + 1}`,
                        })),
                        question: '긴 질문 내용을 표시합니다.\n'.repeat(80),
                      },
                    ],
                    sessionId: 'height-test',
                    type: 'question',
                  },
                ]
              : []
          }
        />
      </div>
    ))
    const card = screen.getByRole('listitem')
    await expect.poll(() => card.getBoundingClientRect().height).toBeLessThanOrEqual(250)
    const body =
      phase === 'question'
        ? screen.getByRole('region', {name: '질문 내용'})
        : phase === 'response'
          ? screen.getByRole('region', {name: '높이 확인 응답'})
          : card.querySelector<HTMLElement>('[tabindex="0"]')!
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
    const control =
      phase === 'question'
        ? screen.getByRole('button', {name: '답변 보내기'})
        : phase === 'response'
          ? screen.getByRole('textbox', {name: 'Codex에 보낼 메시지'})
          : null
    const before = control?.getBoundingClientRect()
    body.scrollTop = 100
    expect(body.scrollTop).toBe(100)
    if (control !== null && before !== undefined) {
      expect(control.getBoundingClientRect().top).toBe(before.top)
      expect(control.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        card.getBoundingClientRect().bottom,
      )
    }
    await page
      .getByRole('list')
      .screenshot({path: `__screenshots__/speech-max-height-${phase}.png`})
  },
)

test('should cap character replies while keeping short replies compact and preserving input', async () => {
  const [response, setResponse] = createSignal('짧은 답변')
  const chat: ReturnType<typeof useCharacterChat> = {
    busy: () => false,
    cancel: vi.fn(),
    draft: () => '',
    edit: vi.fn(),
    error: () => null,
    interrupt: vi.fn(),
    message: () => null,
    notice: () => '',
    response,
    send: vi.fn(async () => undefined),
  }
  render(() => (
    <div class="w-80 p-12">
      <SCodexSpeechStack maxHeight={1800} character={chat} />
    </div>
  ))
  const card = screen.getByRole('listitem')
  const input = within(card).getByRole('textbox', {name: '캐릭터에게 보낼 메시지'})
  const initial = card.getBoundingClientRect().height
  expect(initial).toBeLessThan(200)
  setResponse('캐릭터의 긴 응답입니다.\n'.repeat(120))
  await expect.poll(() => card.getBoundingClientRect().height).toBeLessThanOrEqual(250)
  const body = screen.getByRole('region', {name: '캐릭터 응답'})
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
  const before = input.getBoundingClientRect()
  body.scrollTop = 100
  expect(input.getBoundingClientRect().top).toBe(before.top)
  expect(within(card).getByRole('textbox', {name: '캐릭터에게 보낼 메시지'})).toBe(input)
  setResponse('짧은 답변')
  await expect.poll(() => card.getBoundingClientRect().height).toBeCloseTo(initial, 1)
})
