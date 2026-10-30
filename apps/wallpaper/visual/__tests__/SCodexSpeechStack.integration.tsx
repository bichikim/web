// oxlint-disable no-await-in-loop -- Successive animation frames must be observed in order.
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {SCodexSpeechStack} from '../../src/components/SCodexSpeechStack'
import {type CodexActivity, codexPort} from '../../src/features/codex'
import {userEvent} from 'vitest/browser'
import 'virtual:uno.css'

const activities: CodexActivity[] = ['A', 'B', 'C', 'D'].map((sessionId) => ({
  notificationId: 1,
  phase: sessionId === 'B' ? 'approval' : 'working',
  receivedAt: 1,
  sessionId,
  text: 'Codex가 작업하고 있어요.',
  title: sessionId,
  tool: 'Bash',
}))
const cards = () =>
  screen
    .getAllByRole('listitem')
    .toSorted((first, second) => Number(first.ariaPosInSet) - Number(second.ariaPosInSet))
const order = () => cards().map((element) => element.dataset.speechId)
const frame = (card: HTMLElement) =>
  card.querySelector<HTMLElement>('aside > [aria-hidden="true"]')!
const draw = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
const settle = async (pass = 0): Promise<void> => {
  const animations = cards().flatMap((element) => element.getAnimations())
  animations.forEach((animation) => animation.finish())
  await Promise.allSettled(animations.map((animation) => animation.finished))
  await Promise.resolve()
  await Promise.resolve()
  if (pass < 6 && cards().some((element) => element.dataset.moving === 'true')) {
    await settle(pass + 1)
  }
  await expect.poll(() => cards().some((element) => element.dataset.moving === 'true')).toBe(false)
}
const mount = async () => {
  const view = render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack activities={activities} />
    </div>
  ))
  await expect.poll(() => getComputedStyle(cards()[0]).transform).not.toBe('none')
  await expect
    .poll(() => screen.getByRole('list').getBoundingClientRect().height)
    .toBeCloseTo(cards()[0].getBoundingClientRect().height + 108, 1)
  await expect.poll(() => screen.getByRole('list').getAnimations().length).toBe(0)
  return view
}
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('should open a rear chat when a real double click also selects its moving header', async () => {
  const open = vi.fn()
  render(() => (
    <div class="w-68 p-12">
      <SCodexSpeechStack activities={activities} onOpen={open} />
    </div>
  ))
  await expect.poll(() => cards().length).toBe(4)
  await settle()
  const rear = screen.getByRole('button', {name: '채팅 C 선택'})
  await userEvent.dblClick(rear, {delay: 100})
  await expect.poll(() => open.mock.calls.length).toBe(1)
  expect(open).toHaveBeenCalledWith('C')
})

test.each(['bottom', 'top'] as const)(
  'should leave moving frames and raised shadows unclipped from the %s edge',
  async (anchor) => {
    render(() => (
      <main class="box-border flex h-[640px] w-[440px] flex-col justify-center p-20">
        <SCodexSpeechStack
          anchor={anchor}
          activities={[
            {...activities[0], text: '긴 진행 메시지\n'.repeat(10)},
            {...activities[1], phase: 'working', text: '짧은 진행'},
          ]}
        />
      </main>
    ))
    const [outgoing, incoming] = cards()
    await expect.poll(() => screen.getByRole('list').getAnimations().length).toBe(0)
    screen.getByRole('button', {name: '채팅 B 선택'}).click()
    const lift = incoming.getAnimations()[0]
    lift.pause()
    lift.currentTime = 150
    await draw()
    // The painted frame already bounds the body. A second card clip must not cut its shadow.
    expect(getComputedStyle(incoming).clipPath).toBe('none')
    expect(getComputedStyle(outgoing).clipPath).toBe('none')
    lift.finish()
    await expect.poll(order).toEqual(['B', 'A'])
    document.getAnimations().forEach((animation) => animation.pause())
    const travel = incoming.getAnimations()[0]
    const departure = outgoing.getAnimations()[0]
    for (const fraction of [0.1, 0.5, 0.9]) {
      travel.currentTime = Number(travel.effect!.getTiming().duration) * fraction
      departure.currentTime = Number(departure.effect!.getTiming().duration) * fraction
      await draw()
      for (const card of cards()) {
        expect(getComputedStyle(card).clipPath).toBe('none')
        const bounds = frame(card).getBoundingClientRect()
        expect(bounds.height).toBeGreaterThanOrEqual(48)
        expect(
          getComputedStyle(frame(card).querySelector('[data-speech-shadow]')!).transform,
        ).not.toBe('none')
      }
    }
    await settle()
    expect(getComputedStyle(outgoing).clipPath).not.toBe('none')
    expect(getComputedStyle(incoming).clipPath).toBe('none')
  },
)

test.each(['bottom', 'top'] as const)(
  'should coordinate size and travel from the %s character edge',
  async (anchor) => {
    render(() => (
      <main
        class="box-border flex h-[640px] w-[344px] p-9"
        classList={{'flex-col': anchor === 'top', 'flex-col-reverse': anchor === 'bottom'}}
      >
        <SCodexSpeechStack
          anchor={anchor}
          activities={[
            {...activities[0], text: '짧은 진행'},
            {...activities[1], phase: 'response', response: '긴 응답\n'.repeat(80)},
            {...activities[2], phase: 'response', response: '중간 응답\n'.repeat(8)},
          ]}
        />
      </main>
    ))
    const list = screen.getByRole('list')
    const [first, selected, last] = cards()
    await expect
      .poll(() => frame(first).getBoundingClientRect().height)
      .toBeCloseTo(first.getBoundingClientRect().height, 1)
    const attached = frame(first).getBoundingClientRect()[anchor]
    const headers = [selected, last].map((card) =>
      card.querySelector('button')!.getBoundingClientRect(),
    )
    expect(headers[1].top - headers[0].top).toBeCloseTo(anchor === 'top' ? 36 : -36, 1)
    for (const card of [selected, last]) {
      const header = card.querySelector('button')!
      const bounds = header.getBoundingClientRect()
      expect(document.elementFromPoint(bounds.left + 100, bounds.top + 16)?.closest('button')).toBe(
        header,
      )
    }
    selected.querySelector('button')!.click()
    const lift = selected.getAnimations()[0]
    lift.pause()
    lift.currentTime = 100
    await draw()
    expect(frame(selected).getBoundingClientRect().height).toBeCloseTo(48, 1)
    lift.finish()
    await expect.poll(order).toEqual(['B', 'A', 'C'])
    const travel = selected.getAnimations()[0]
    document.getAnimations().forEach((motion) => motion.pause())
    const [from, to] = travel.effect!.getKeyframes()
    const start = Number.parseFloat(String(from['--speech-y']))
    const end = Number.parseFloat(String(to['--speech-y']))
    const height = Number.parseFloat(String(from['--speech-height']))
    const target = Number.parseFloat(String(to['--speech-height']))
    for (const sample of [0, 0.25, 0.5, 0.8]) {
      travel.currentTime = Number(travel.effect!.getTiming().duration) * sample
      await draw()
      const y = Number.parseFloat(getComputedStyle(selected).getPropertyValue('--speech-y'))
      const progress = (y - start) / (end - start)
      const bounds = frame(selected).getBoundingClientRect()
      const origin =
        anchor === 'top'
          ? list.getBoundingClientRect().top
          : list.getBoundingClientRect().bottom - 72
      expect(bounds[anchor]).toBeCloseTo(origin + y, 1)
      expect(bounds.height).toBeCloseTo(height + (target - height) * progress, 1)
    }
    const before = frame(selected).getBoundingClientRect()
    last.querySelector('button')!.click()
    expect(frame(selected).getBoundingClientRect()[anchor]).toBeCloseTo(before[anchor], 1)
    expect(frame(selected).getBoundingClientRect().height).toBeCloseTo(before.height, 1)
    await settle()
    expect(order()).toEqual(['C', 'B', 'A'])
    expect(frame(last).getBoundingClientRect()[anchor]).toBeCloseTo(attached, 1)
  },
)

test('should keep every approval action outside scrolling request content at the height limit', async () => {
  const decide = vi.spyOn(codexPort, 'decideApproval').mockResolvedValue(undefined)
  const [limit, setLimit] = createSignal(480)
  render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack
        maxHeight={limit()}
        activities={[{...activities[0], phase: 'approval'}]}
        approvals={['first', 'second'].map((id) => ({
          cwd: '/project',
          id,
          input: {command: 'long command\n'.repeat(100)},
          sessionId: 'A',
          tool: id,
          turnId: 'turn',
        }))}
      />
    </div>
  ))
  for (const height of [480, 380]) {
    setLimit(height)
    const bubble = screen.getByRole('status')
    expect(bubble.getBoundingClientRect().height).toBeLessThanOrEqual(height - 72)
    for (const id of ['first', 'second']) {
      const request = within(screen.getByLabelText(`${id} 승인`))
      const region = request.getByRole('region')
      const button = request.getByRole('button', {name: '이번만 승인'})
      const before = button.getBoundingClientRect()
      expect(region.contains(button)).toBe(false)
      expect(region.scrollHeight).toBeGreaterThan(region.clientHeight)
      region.scrollTop = 400
      expect(region.scrollTop).toBe(400)
      expect(button.getBoundingClientRect().y).toBe(before.y)
      expect(before.bottom).toBeLessThanOrEqual(bubble.getBoundingClientRect().bottom)
      expect(document.elementFromPoint(before.x + 10, before.y + 10)).toBe(button)
    }
  }
  within(screen.getByLabelText('second 승인')).getByRole('button', {name: '거절'}).click()
  await expect.poll(() => decide.mock.calls).toEqual([['second', 'deny']])
})

test('should keep question submission visible while all question fields scroll', async () => {
  const answer = vi.spyOn(codexPort, 'answerQuestion').mockResolvedValue(undefined)
  render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack
        maxHeight={380}
        activities={[{...activities[0], phase: 'question'}]}
        questions={[
          {
            id: 'long-question',
            questions: [
              {
                id: 'q',
                options: Array.from({length: 10}, (_, i) => ({
                  description: '설명 '.repeat(10),
                  label: `항목 ${i}`,
                })),
                question: '어떤 항목인가요?',
              },
            ],
            sessionId: 'A',
            turnId: 'turn',
          },
        ]}
      />
    </div>
  ))
  const region = screen.getByRole('region', {name: '질문 내용'})
  const button = screen.getByRole('button', {name: '답변 보내기'})
  const before = button.getBoundingClientRect()
  expect(region.contains(button)).toBe(false)
  expect(region.scrollHeight).toBeGreaterThan(region.clientHeight)
  region.scrollTop = region.scrollHeight
  expect(region.scrollTop).toBeGreaterThan(0)
  expect(button.getBoundingClientRect().y).toBe(before.y)
  expect(document.elementFromPoint(before.x + 10, before.y + 10)).toBe(button)
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '고정 버튼 확인'}})
  button.click()
  await expect.poll(() => answer.mock.calls).toEqual([['long-question', {q: '고정 버튼 확인'}]])
})

test('should keep the composer fixed while a capped response scrolls in both directions', async () => {
  const [limit, setLimit] = createSignal(500)
  const response = Array.from(
    {length: 100},
    (_, line) => `${line}: ${'very-long-line '.repeat(80)}`,
  ).join('\n')
  render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack
        maxHeight={limit()}
        activities={activities
          .slice(0, 2)
          .map((activity) => ({...activity, phase: 'response', response}))}
      />
    </div>
  ))
  const list = screen.getByRole('list', {name: 'Codex 채팅 알림'})
  const region = screen.getByRole('region', {name: 'A 응답'})
  const input = within(cards()[0]).getByRole('textbox', {name: 'Codex에 보낼 메시지'})
  const before = input.getBoundingClientRect()
  expect(list.getBoundingClientRect().height).toBeLessThanOrEqual(428)
  expect(region.scrollHeight).toBeGreaterThan(region.clientHeight)
  expect(region.scrollWidth).toBeGreaterThan(region.clientWidth)
  region.scrollTop = 140
  region.scrollLeft = 160
  expect(region.scrollTop).toBe(140)
  expect(region.scrollLeft).toBe(160)
  expect(input.getBoundingClientRect().y).toBe(before.y)
  expect(document.elementFromPoint(before.x + 20, before.y + 20)).toBe(input)
  input.focus()
  expect(document.activeElement).toBe(input)
  setLimit(380)
  expect(list.getBoundingClientRect().height).toBeLessThanOrEqual(308)
  expect(within(cards()[0]).getByRole('textbox', {name: 'Codex에 보낼 메시지'})).toBe(input)
  expect(document.activeElement).toBe(input)
  const resized = input.getBoundingClientRect()
  expect(region.getBoundingClientRect().bottom).toBeLessThanOrEqual(resized.top)
  region.scrollTop = 200
  expect(input.getBoundingClientRect().y).toBe(resized.y)
})

test('should compact to the selected cards height while keeping covered contents and animation intact', async () => {
  render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack
        activities={[
          {...activities[0], text: '실제 진행 메시지를 표시합니다.'},
          {...activities[1], phase: 'response', response: '긴 응답\n'.repeat(80)},
        ]}
      />
    </div>
  ))
  const list = screen.getByRole('list', {name: 'Codex 채팅 알림'})
  const [short, long] = cards()
  const shortHeight = short.getBoundingClientRect().height
  const longHeight = long.getBoundingClientRect().height
  const response = within(long).getByRole('region', {name: 'B 응답'})
  const composer = within(long).getByRole('textbox')
  expect(longHeight).toBeGreaterThan(shortHeight + 200)
  await expect.poll(() => list.getBoundingClientRect().height).toBeCloseTo(shortHeight + 36, 0)
  screen.getByRole('button', {name: '채팅 B 선택'}).click()
  // Lifting must not temporarily restore the tallest covered card's layout height.
  expect(list.getBoundingClientRect().height).toBeCloseTo(shortHeight + 36, 0)
  await settle()
  await expect.poll(() => list.getBoundingClientRect().height).toBeCloseTo(longHeight + 36, 0)
  fireEvent.input(composer, {target: {value: '유지할 초안'}})
  response.scrollTop = 90
  expect(response.scrollTop).toBe(90)
  screen.getByRole('button', {name: '채팅 A 선택'}).click()
  await settle()
  await expect.poll(() => list.getBoundingClientRect().height).toBeCloseTo(shortHeight + 36, 0)
  expect(long.getBoundingClientRect().height).toBe(longHeight)
  expect(within(long).getByRole('textbox')).toBe(composer)
  expect(composer).toHaveValue('유지할 초안')
  expect(response.scrollTop).toBe(90)
  expect(within(short).getByText('실제 진행 메시지를 표시합니다.')).toBeVisible()
  expect(within(short).getByText('Bash').getBoundingClientRect().height).toBeLessThan(
    within(short).getByText('실제 진행 메시지를 표시합니다.').getBoundingClientRect().height,
  )
})

test('should move a taller card along one screen-space path without rebounding when the layout settles', async () => {
  render(() => (
    <main class="box-border flex h-[640px] w-[344px] flex-col justify-end p-9">
      <SCodexSpeechStack
        activities={[
          {...activities[0], text: '짧은 진행'},
          {...activities[1], phase: 'response', response: '긴 응답\n'.repeat(80)},
        ]}
      />
    </main>
  ))
  const list = screen.getByRole('list')
  const [, tall] = cards()
  const height = tall.getBoundingClientRect().height
  await expect.poll(() => list.getAnimations().length).toBe(0)
  const bottom = list.getBoundingClientRect().bottom
  screen.getByRole('button', {name: '채팅 B 선택'}).click()
  const lift = tall.getAnimations()[0]
  lift.pause()
  lift.currentTime = 200
  await draw()
  const raised = frame(tall).getBoundingClientRect().top
  lift.finish()
  await expect.poll(order).toEqual(['B', 'A'])
  const travel = tall.getAnimations()[0]
  travel.pause()
  travel.currentTime = 0
  await draw()
  const destination = bottom - height
  expect(frame(tall).getBoundingClientRect().top).toBeCloseTo(raised, 1)
  expect(travel.effect!.getTiming().duration).toBeCloseTo(
    (Math.abs(destination - raised) / 160) * 1000,
    0,
  )
  // Complete any separate layout animation before the card: it must not bend the card's path.
  list.getAnimations().forEach((animation) => animation.finish())
  travel.pause()
  const duration = Number(travel.effect!.getTiming().duration)
  const samples: number[] = []
  const sample = async (progress: number) => {
    travel.currentTime = duration * progress
    await draw()
    samples.push(frame(tall).getBoundingClientRect().top)
  }
  await sample(0.25)
  await sample(0.5)
  await sample(0.8)
  await sample(1)
  expect(samples).toEqual(samples.toSorted((first, second) => second - first))
  expect(samples.every((top) => top >= destination - 0.1 && top <= raised + 0.1)).toBe(true)
  await settle()
  expect(frame(tall).getBoundingClientRect().top).toBeCloseTo(destination, 1)
  expect(tall.getBoundingClientRect().height).toBe(height)
})

test('should retarget a changed response from its drawn position without adding another lift', async () => {
  const [items, setItems] = createSignal<CodexActivity[]>([
    {...activities[0], text: '짧은 진행'},
    {...activities[1], phase: 'response', response: '응답\n'.repeat(8)},
  ])
  render(() => (
    <main class="box-border flex h-[640px] w-[344px] flex-col-reverse p-9">
      <SCodexSpeechStack activities={items()} />
    </main>
  ))
  const list = screen.getByRole('list')
  const [, selected] = cards()
  await expect.poll(() => list.getAnimations().length).toBe(0)
  screen.getByRole('button', {name: '채팅 B 선택'}).click()
  selected.getAnimations()[0].finish()
  await expect.poll(order).toEqual(['B', 'A'])
  const previous = selected.getAnimations()[0]
  const cancelled = previous.finished.catch(() => undefined)
  previous.pause()
  previous.currentTime = Number(previous.effect!.getTiming().duration) * 0.4
  await draw()
  const before = frame(selected).getBoundingClientRect().top
  const shadow = getComputedStyle(frame(selected)).boxShadow
  setItems((value) =>
    value.map((item) =>
      item.sessionId === 'B' ? {...item, response: '늘어난 응답\n'.repeat(80)} : item,
    ),
  )
  await expect.poll(() => selected.getAnimations()[0] !== previous).toBe(true)
  const latest = selected.getAnimations()[0]
  latest.pause()
  latest.currentTime = 0
  await draw()
  expect(frame(selected).getBoundingClientRect().top).toBeCloseTo(before, 1)
  expect(getComputedStyle(frame(selected)).boxShadow).toBe(shadow)
  const destination = list.getBoundingClientRect().bottom - selected.getBoundingClientRect().height
  expect(latest.effect!.getTiming().duration).toBeCloseTo(
    (Math.abs(destination - before) / 160) * 1000,
    0,
  )
  await cancelled
  await settle()
  expect(frame(selected).getBoundingClientRect().top).toBeCloseTo(destination, 1)
  expect(order()).toEqual(['B', 'A'])
})

test('should retain drawn positions when switching between cards of different heights during travel', async () => {
  render(() => (
    <main class="box-border flex h-[640px] w-[344px] flex-col-reverse p-9">
      <SCodexSpeechStack
        activities={[
          {...activities[0], text: '짧은 진행'},
          {...activities[1], phase: 'response', response: '긴 응답\n'.repeat(80)},
          {...activities[2], phase: 'response', response: '중간 응답\n'.repeat(8)},
        ]}
      />
    </main>
  ))
  const [, tall] = cards()
  screen.getByRole('button', {name: '채팅 B 선택'}).click()
  tall.getAnimations()[0].finish()
  await expect.poll(order).toEqual(['B', 'A', 'C'])
  const travel = tall.getAnimations()[0]
  travel.pause()
  travel.currentTime = Number(travel.effect!.getTiming().duration) * 0.6
  await draw()
  const before = frame(tall).getBoundingClientRect().top
  const shadow = getComputedStyle(frame(tall)).boxShadow
  screen.getByRole('button', {name: '채팅 C 선택'}).click()
  expect(frame(tall).getBoundingClientRect().top).toBeCloseTo(before, 1)
  expect(getComputedStyle(frame(tall)).boxShadow).toBe(shadow)
  await settle()
  expect(order()).toEqual(['C', 'B', 'A'])
  const final = cards()[0].getBoundingClientRect().top
  await draw()
  expect(cards()[0].getBoundingClientRect().top).toBeCloseTo(final, 1)
})

test('should send a prompt to its selected chat while covered composers remain inert', async () => {
  const send = vi.spyOn(codexPort, 'sendPrompt').mockResolvedValue(undefined)
  render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack
        activities={activities
          .slice(0, 2)
          .map((activity) => ({...activity, phase: 'response', response: '응답'}))}
      />
    </div>
  ))
  const behind = within(cards()[1]).getByRole('textbox', {name: 'Codex에 보낼 메시지'})
  behind.focus()
  expect(document.activeElement).not.toBe(behind)
  const selected = within(cards()[0])
  fireEvent.input(selected.getByRole('textbox'), {target: {value: 'A 요청'}})
  selected.getByRole('button', {name: '보내기'}).click()
  await expect.poll(() => send.mock.calls).toEqual([['A', 'A 요청']])
  screen.getByRole('button', {name: '채팅 B 선택'}).click()
  await settle()
  const next = within(cards()[0])
  fireEvent.input(next.getByRole('textbox'), {target: {value: 'B 요청'}})
  next.getByRole('button', {name: '보내기'}).click()
  await expect
    .poll(() => send.mock.calls)
    .toEqual([
      ['A', 'A 요청'],
      ['B', 'B 요청'],
    ])
})

test('should answer only the selected chats question while covered question fields remain inert', async () => {
  const answer = vi.spyOn(codexPort, 'answerQuestion').mockResolvedValue(undefined)
  render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack
        activities={activities.slice(0, 2).map((activity) => ({...activity, phase: 'question'}))}
        questions={['A', 'B'].map((sessionId) => ({
          id: `question-${sessionId}`,
          questions: [{id: 'q', options: [{label: '선택'}], question: `${sessionId} 질문`}],
          sessionId,
          turnId: 'turn',
        }))}
      />
    </div>
  ))
  const front = within(cards()[0]).getByRole('textbox')
  const behind = within(cards()[1]).getByRole('textbox')
  behind.focus()
  expect(document.activeElement).not.toBe(behind)
  fireEvent.input(front, {target: {value: '직접 답변'}})
  within(cards()[0]).getByRole('button', {name: '답변 보내기'}).click()
  await expect.poll(() => answer.mock.calls).toEqual([['question-A', {q: '직접 답변'}]])
  screen.getByRole('button', {name: '채팅 B 선택'}).click()
  await settle()
  const selected = within(cards()[0])
  selected.getByRole('button', {name: '선택'}).click()
  selected.getByRole('button', {name: '답변 보내기'}).click()
  await expect
    .poll(() => answer.mock.calls)
    .toEqual([
      ['question-A', {q: '직접 답변'}],
      ['question-B', {q: '선택'}],
    ])
})

test('should fill both rounded overlap corners without exposing covered bodies after selection', async () => {
  await mount()
  const expectCorners = () => {
    const ordered = cards()
    for (const [index, front] of ordered.slice(0, -1).entries()) {
      const rect = frame(front).getBoundingClientRect()
      const behind = ordered[index + 1]
      for (const x of [rect.left + 2, rect.right - 2]) {
        expect(document.elementFromPoint(x, rect.top + 3)?.closest('[data-speech-id]')).toBe(behind)
        expect(document.elementFromPoint(x, rect.top + 34)?.closest('[data-speech-id]')).toBe(front)
      }
      expect(
        document
          .elementFromPoint(rect.left + rect.width / 2, rect.top + 3)
          ?.closest('[data-speech-id]'),
      ).toBe(front)
      expect(
        document
          .elementsFromPoint(rect.left + rect.width / 2, rect.top + 3)
          .some((element) => element.closest('[data-speech-id]') === behind),
      ).toBe(false)
    }
  }
  expectCorners()
  screen.getByRole('button', {name: '채팅 C 선택'}).click()
  await settle()
  expectCorners()
})

test('should select through the entire exposed header and keep close independent', async () => {
  const dismissed = vi.fn()
  render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack activities={activities} onDismiss={dismissed} />
    </div>
  ))
  await expect.poll(() => getComputedStyle(cards()[0]).transform).not.toBe('none')
  const chooseAt = async (x: number, y: number) => {
    const card = cards().find((element) => element.dataset.speechId === 'D')!
    const bounds = frame(card).getBoundingClientRect()
    const hit = document.elementFromPoint(bounds.x + x, bounds.y + y) as HTMLElement
    expect(hit.closest('button')?.getAttribute('aria-label')).toBe('채팅 D 선택')
    hit.click()
    await settle()
    expect(order()[0]).toBe('D')
    screen.getByRole('button', {name: '채팅 A 선택'}).click()
    await settle()
  }
  await chooseAt(36, 4)
  await chooseAt(4, 22)
  await chooseAt(110, 22)
  const card = cards().find((element) => element.dataset.speechId === 'D')!
  const badge = within(card).getByText('작업 중').getBoundingClientRect()
  const hit = document.elementFromPoint(badge.x + badge.width / 2, badge.y + 8) as HTMLElement
  expect(hit.closest('button')?.getAttribute('aria-label')).toBe('채팅 D 선택')
  hit.click()
  await settle()
  expect(order()[0]).toBe('D')
  const behind = cards().find((element) => element.dataset.speechId === 'A')!
  const close = within(behind).getByRole('button', {name: 'A 알림 닫기'})
  const closeBounds = close.getBoundingClientRect()
  const closeHit = document.elementFromPoint(closeBounds.x + 8, closeBounds.y + 8) as HTMLElement
  expect(closeHit.closest('button')).toBe(close)
  closeHit.click()
  expect(dismissed).toHaveBeenCalledExactlyOnceWith(activities[0])
  expect(order()[0]).toBe('D')
})

test('should overlap titles, lift, descend at distance based speed, and restore the shadow', async () => {
  await mount()
  const [first, second, third, fourth] = cards()
  const originals = [first, second, third, fourth]
  const sizes = originals.map((element) => element.getBoundingClientRect().height)
  const start = frame(third).getBoundingClientRect()
  const aside = frame(third)
  const shadow = aside.querySelector('[data-speech-shadow]')!
  const rest = getComputedStyle(shadow).transform
  const background = getComputedStyle(aside).backgroundColor
  expect(getComputedStyle(third).clipPath).not.toBe('none')
  for (const card of originals) {
    const rect = frame(card).getBoundingClientRect()
    expect(rect.x).toBe(start.x)
    expect(document.elementFromPoint(rect.x + 20, rect.y + 16)?.closest('[data-speech-id]')).toBe(
      card,
    )
  }
  expect(frame(first).getBoundingClientRect().top - frame(third).getBoundingClientRect().top).toBe(
    72,
  )
  third.querySelector('button')!.click()
  expect(getComputedStyle(third).clipPath).toBe('none')
  const lift = third.getAnimations()[0]
  expect(lift.effect!.getTiming().duration).toBe(200)
  lift.pause()
  lift.currentTime = 100
  await draw()
  const raised = frame(third).getBoundingClientRect()
  expect(raised.y).toBeLessThan(start.y)
  expect(raised.y).toBeGreaterThanOrEqual(start.y - 8)
  expect(raised.width).toBe(start.width)
  expect(raised.height).toBe(start.height)
  expect(raised.x).toBe(start.x)
  expect(getComputedStyle(shadow).transform).not.toBe(rest)
  lift.finish()
  await expect.poll(order).toEqual(['C', 'A', 'B', 'D'])
  expect(screen.getAllByRole('listitem')).toEqual([fourth, second, first, third])
  const descent = third.getAnimations()[0]
  expect(descent.effect!.getTiming().easing).toBe('cubic-bezier(0.22, 0.8, 0.25, 1)')
  const path = descent.effect!.getKeyframes()
  const startBottom = Number.parseFloat(String(path[0]['--speech-y']))
  const endBottom = Number.parseFloat(String(path[1]['--speech-y']))
  expect(descent.effect!.getTiming().duration).toBeCloseTo(
    ((endBottom - startBottom) / 160) * 1000,
    1,
  )
  descent.pause()
  descent.currentTime = 250
  await draw()
  expect(Number(getComputedStyle(third).getPropertyValue('--speech-depth'))).toBe(1)
  await settle()
  expect(getComputedStyle(shadow).transform).toBe(rest)
  expect(getComputedStyle(aside).backgroundColor).toBe(background)
  expect(frame(third).getBoundingClientRect().y - frame(fourth).getBoundingClientRect().y).toBe(108)
  expect(third.getBoundingClientRect().width).toBe(start.width)
  expect(frame(third).getBoundingClientRect().height).toBe(third.getBoundingClientRect().height)
  expect(getComputedStyle(first).clipPath).not.toBe('none')
  expect(originals.every((element) => getComputedStyle(element).zIndex === 'auto')).toBe(true)
  expect(originals.map((element) => element.getBoundingClientRect().height)).toEqual(sizes)
})

test('should continue from rendered positions and shadows when reselected during lift and descent', async () => {
  await mount()
  const [, second, third, fourth] = cards()
  third.querySelector('button')!.click()
  const lift = third.getAnimations()[0]
  lift.pause()
  lift.currentTime = 110
  await draw()
  const before = frame(third).getBoundingClientRect()
  const shadow = getComputedStyle(frame(third)).boxShadow
  fourth.querySelector('button')!.click()
  expect(frame(third).getBoundingClientRect().y).toBeCloseTo(before.y, 2)
  expect(getComputedStyle(frame(third)).boxShadow).toBe(shadow)
  const next = fourth.getAnimations()[0]
  next.finish()
  await expect.poll(order).toEqual(['D', 'A', 'B', 'C'])
  const descent = fourth.getAnimations()[0]
  expect(Number(descent.effect!.getTiming().duration)).toBeGreaterThan(725)
  descent.pause()
  descent.currentTime = 320
  await draw()
  const position = frame(fourth).getBoundingClientRect()
  const depth = getComputedStyle(fourth).getPropertyValue('--speech-depth')
  const reveal = getComputedStyle(fourth).getPropertyValue('--speech-reveal')
  second.querySelector('button')!.click()
  expect(frame(fourth).getBoundingClientRect().y).toBeCloseTo(position.y, 2)
  expect(getComputedStyle(fourth).getPropertyValue('--speech-depth')).toBe(depth)
  expect(getComputedStyle(fourth).getPropertyValue('--speech-reveal')).toBe(reveal)
  second.getAnimations()[0].finish()
  await expect.poll(order).toEqual(['B', 'D', 'A', 'C'])
  await settle()
  expect(order()).toEqual(['B', 'D', 'A', 'C'])
  expect(
    cards().map((element) => getComputedStyle(element).getPropertyValue('--speech-depth')),
  ).toEqual(['0', '0', '0', '0'])
})

test('should show distinct stable chat colors and scroll a long response without selecting another card', async () => {
  let closed: CodexActivity | undefined
  render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack
        activities={activities.map((item, index) => ({
          ...item,
          phase: 'response',
          response: Array.from({length: 80}, (_, line) => `${index}: 응답 ${line}`).join('\n'),
        }))}
        onDismiss={(item) => {
          closed = item
        }}
      />
    </div>
  ))
  await expect.poll(() => getComputedStyle(cards()[0]).transform).not.toBe('none')
  const colors = cards().map(
    (card) => getComputedStyle(frame(card).querySelector('[data-speech-outline]')!).stroke,
  )
  expect(new Set(colors).size).toBe(4)
  const region = screen.getByRole('region', {name: 'A 응답'})
  expect(region.scrollHeight).toBeGreaterThan(region.clientHeight)
  const bounds = region.getBoundingClientRect()
  expect(region.contains(document.elementFromPoint(bounds.x + 20, bounds.y + 20))).toBe(true)
  region.scrollTop = 100
  expect(region.scrollTop).toBe(100)
  screen.getByRole('button', {name: 'A 알림 닫기'}).click()
  expect(closed?.sessionId).toBe('A')
  expect(order()).toEqual(['A', 'B', 'C', 'D'])
  screen.getByRole('button', {name: '채팅 C 선택'}).click()
  await settle()
  expect(
    cards().map(
      (card) => getComputedStyle(frame(card).querySelector('[data-speech-outline]')!).stroke,
    ),
  ).toEqual([colors[2], colors[0], colors[1], colors[3]])
})

test('should scope approval actions to their chat and prevent focus in covered bodies', async () => {
  const decide = vi.spyOn(codexPort, 'decideApproval').mockResolvedValue(undefined)
  render(() => (
    <div class="w-[272px] p-12 font-sans leading-relaxed">
      <SCodexSpeechStack
        activities={activities}
        approvals={['A', 'B'].map((sessionId) => ({
          cwd: '/project',
          id: `approval-${sessionId}`,
          input: {command: 'pwd'},
          sessionId,
          tool: 'Bash',
          turnId: 'turn',
        }))}
      />
    </div>
  ))
  const active = within(cards()[0]).getByRole('button', {name: '이번만 승인'})
  expect(active.closest('[data-speech-id]')?.getAttribute('data-speech-id')).toBe('A')
  const covered = cards()[1].querySelector('section button') as HTMLButtonElement
  covered.focus()
  expect(document.activeElement).not.toBe(covered)
  const rect = active.getBoundingClientRect()
  expect(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).toBe(active)
  active.click()
  await expect.poll(() => decide.mock.calls).toEqual([['approval-A', 'allow']])
})

test('should keep the short front card stationary through shadow settlement and subsequent layout frames', async () => {
  render(() => (
    <main class="box-border flex h-[640px] w-[344px] flex-col-reverse p-9">
      <SCodexSpeechStack
        activities={[
          {...activities[0], text: '짧은 진행'},
          {...activities[1], phase: 'response', response: '긴 응답\n'.repeat(80)},
        ]}
      />
    </main>
  ))
  const list = screen.getByRole('list')
  await expect.poll(() => list.getAnimations().length).toBe(0)
  screen.getByRole('button', {name: '채팅 B 선택'}).click()
  await settle()
  screen.getByRole('button', {name: '채팅 A 선택'}).click()
  const short = cards().find((card) => card.dataset.speechId === 'A')!
  short.getAnimations()[0].finish()
  await expect.poll(order).toEqual(['A', 'B'])
  short.getAnimations()[0].finish()
  await expect.poll(() => short.getAnimations()[0]?.effect?.getTiming().duration).toBe(180)
  const shadow = short.getAnimations()[0]
  shadow.pause()
  shadow.currentTime = 179
  await draw()
  const top = frame(short).getBoundingClientRect().top
  cards()
    .filter((card) => card !== short)
    .forEach((card) => card.getAnimations().forEach((animation) => animation.finish()))
  shadow.finish()
  await expect.poll(() => list.dataset.moving).toBe('false')
  // Sample post-completion frames too: force-finishing all animations can hide a new layout transition.
  for (let index = 0; index < 16; index += 1) {
    await draw()
    expect(frame(short).getBoundingClientRect().top).toBeCloseTo(top, 1)
    expect(list.getAnimations()).toHaveLength(0)
  }
})

test('should reverse an outgoing bubble from its rendered size when selected again', async () => {
  render(() => (
    <main class="box-border flex h-[640px] w-[344px] flex-col-reverse p-9">
      <SCodexSpeechStack
        activities={[
          {...activities[0], phase: 'response', response: '긴 응답\n'.repeat(80)},
          {...activities[1], phase: 'working', text: '짧은 진행'},
        ]}
      />
    </main>
  ))
  const [long, short] = cards()
  await expect.poll(() => screen.getByRole('list').getAnimations().length).toBe(0)
  screen.getByRole('button', {name: '채팅 B 선택'}).click()
  short.getAnimations()[0].finish()
  await expect.poll(order).toEqual(['B', 'A'])
  const outgoing = long.getAnimations()[0]
  outgoing.pause()
  outgoing.currentTime = Number(outgoing.effect!.getTiming().duration) * 0.3
  await draw()
  const before = getComputedStyle(long).getPropertyValue('--speech-reveal')
  expect(Number(before)).toBeGreaterThan(0)
  expect(Number(before)).toBeLessThan(1)
  const position = frame(long).getBoundingClientRect().top
  const size = frame(long).getBoundingClientRect().height
  screen.getByRole('button', {name: '채팅 A 선택'}).click()
  expect(getComputedStyle(long).getPropertyValue('--speech-reveal')).toBe(before)
  expect(frame(long).getBoundingClientRect().top).toBeCloseTo(position, 1)
  expect(frame(long).getBoundingClientRect().height).toBeCloseTo(size, 1)
  const resumed = long.getAnimations()[0]
  resumed.pause()
  resumed.currentTime = 100
  await draw()
  expect(Number(getComputedStyle(long).getPropertyValue('--speech-reveal'))).toBe(Number(before))
  resumed.finish()
  await expect.poll(order).toEqual(['A', 'B'])
  const expansion = long.getAnimations()[0]
  expansion.pause()
  expansion.currentTime = Number(expansion.effect!.getTiming().duration) / 2
  await draw()
  expect(Number(getComputedStyle(long).getPropertyValue('--speech-reveal'))).toBeGreaterThan(
    Number(before),
  )
  outgoing.dispatchEvent(new Event('finish'))
  await settle()
  expect(order()).toEqual(['A', 'B'])
  expect(getComputedStyle(long).clipPath).toBe('none')
})

test('should resize the painted background and border while retaining the full content layout', async () => {
  render(() => (
    <main class="box-border flex h-[640px] w-[344px] flex-col-reverse p-9">
      <SCodexSpeechStack
        target={{x: 140, y: 900}}
        activities={[
          {...activities[0], phase: 'response', response: '긴 응답\n'.repeat(80)},
          {...activities[1], phase: 'working', text: '짧은 진행'},
        ]}
      />
    </main>
  ))
  const [long, short] = cards()
  const region = screen.getByRole('region', {name: 'A 응답'})
  const composer = screen.getByRole('textbox', {name: 'Codex에 보낼 메시지'})
  fireEvent.input(composer, {target: {value: '보존할 초안'}})
  region.scrollTop = 100
  const original = frame(long).getBoundingClientRect().height
  const background = getComputedStyle(frame(long).querySelector('[data-speech-outline]')!).fill
  await expect.poll(() => screen.getByRole('list').getAnimations().length).toBe(0)
  screen.getByRole('button', {name: '채팅 B 선택'}).click()
  const incoming = short.getAnimations()[0]
  incoming.pause()
  incoming.currentTime = 0
  await draw()
  const covered = frame(short).getBoundingClientRect().height
  incoming.currentTime = 100
  await draw()
  expect(frame(short).getBoundingClientRect().height).toBe(covered)
  incoming.finish()
  await expect.poll(order).toEqual(['B', 'A'])
  const outgoing = long.getAnimations()[0]
  outgoing.pause()
  outgoing.currentTime = Number(outgoing.effect!.getTiming().duration) * 0.3
  await draw()
  const middle = frame(long).getBoundingClientRect().height
  expect(middle).toBeLessThan(original)
  expect(middle).toBeGreaterThan(48)
  const svg = frame(long).querySelector('svg')!
  expect(svg).toHaveAttribute('data-edge', 'bottom')
  await expect.poll(() => Number(svg.getAttribute('viewBox')!.split(' ')[3])).toBeCloseTo(middle, 1)
  expect(getComputedStyle(svg.querySelector('[data-speech-outline]')!).fill).toBe(background)
  expect(getComputedStyle(svg.querySelector('[data-speech-outline]')!).strokeWidth).toBe('3px')
  expect(long.getBoundingClientRect().height).toBe(original)
  await settle()
  expect(frame(long).getBoundingClientRect().height).toBe(48)
  expect(frame(short).getBoundingClientRect().height).toBe(short.getBoundingClientRect().height)
  expect(region.scrollTop).toBe(100)
  expect(composer).toHaveValue('보존할 초안')
})
