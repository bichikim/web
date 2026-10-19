import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {SCodexSpeech} from '../../src/components/SCodexSpeech'
import 'virtual:uno.css'

afterEach(cleanup)
it('should wrap prose and code, scroll only wide tables, and leave the composer fixed', async () => {
  const long = 'LONG_UNBROKEN_VALUE_'.repeat(12)
  const response = [
    '**굵은 글씨**와 `inline()`',
    long,
    `\`\`\`ts\nconst value = "${long}"\n\`\`\``,
    `| 이름 | 내용 |\n| --- | ---: |\n| 표 항목 | ${long} |`,
    '추가 내용\n'.repeat(30),
  ].join('\n\n')
  const [wrap, setWrap] = createSignal(true)
  render(() => (
    <div class="w-[272px] p-8" style={{'--speech-limit': '420px'}}>
      <SCodexSpeech
        wrap={wrap()}
        activity={{
          notificationId: 1,
          phase: 'response',
          receivedAt: 1,
          response,
          sessionId: 'chat',
          text: '응답',
          title: '서식 확인',
          tool: null,
        }}
      />
    </div>
  ))
  const body = screen.getByRole('region', {name: '서식 확인 응답'})
  const code = screen.getByRole('region', {name: 'ts 코드'})
  const table = screen.getByRole('region', {name: '표'})
  const composer = screen.getByRole('textbox', {name: 'Codex에 보낼 메시지'})
  expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1)
  expect(code.scrollWidth).toBeLessThanOrEqual(code.clientWidth + 1)
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
  expect(table.scrollWidth).toBeGreaterThan(table.clientWidth)
  table.scrollLeft = 100
  await expect.poll(() => table.scrollLeft).toBe(100)
  expect(getComputedStyle(body.querySelector('strong')!).fontWeight).toBe('600')
  expect(getComputedStyle(body.querySelector('p code')!).backgroundColor).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  const fixed = composer.getBoundingClientRect().top
  body.scrollTop = 100
  await expect.poll(() => body.scrollTop).toBe(100)
  expect(composer.getBoundingClientRect().top).toBeCloseTo(fixed, 1)
  setWrap(false)
  expect(body.scrollWidth).toBeGreaterThan(body.clientWidth)
  body.scrollLeft = 80
  await expect.poll(() => body.scrollLeft).toBe(80)
  setWrap(true)
  expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1)
  expect(body.scrollLeft).toBe(0)
})
