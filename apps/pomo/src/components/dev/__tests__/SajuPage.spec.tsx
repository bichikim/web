/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {For, type JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {SajuPage} from '../SajuPage'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('../../p-date-picker/PDatePicker', () => ({
  PDatePicker: (props: {label: string; value: string; onChange: (value: string) => void}) => (
    <div>
      <span>{`${props.label}: ${props.value}`}</span>
      <button type="button" onClick={() => props.onChange('1995-03-17')}>
        다른 생년월일 선택
      </button>
      <button type="button" onClick={() => props.onChange('')}>
        선택 지우기
      </button>
    </div>
  ),
}))
vi.mock('../../p-select/PSelect', () => ({
  PSelect: (props: {
    label: string
    onChange: (value: string) => void
    options: ReadonlyArray<{label: string; value: string}>
    value: string
  }) => (
    <select
      aria-label={props.label}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
    >
      <For each={props.options}>
        {(option) => <option value={option.value}>{option.label}</option>}
      </For>
    </select>
  ),
}))

afterEach(cleanup)

it('should calculate and display each k-saju result for the entered birth', () => {
  render(() => <SajuPage />)

  fireEvent.click(screen.getByRole('button', {name: '다른 생년월일 선택'}))
  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '재물에 대해 알려줘'}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  expect(screen.getByRole('heading', {name: '사주팔자 · deriveSaju()'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: '오행 · analyzeElements()'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: '십성 · analyzeSipseong()'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: '일주 · iljuInfo()'})).toBeTruthy()
  expect(screen.getByRole('heading', {name: '대운 · analyzeDaeun()'})).toBeTruthy()
  expect(screen.getByText(/"lacking": \[\s*"金"/u)).toBeTruthy()
  const messages = JSON.parse(
    screen.getByRole('region', {name: 'LLM 전달 값'}).querySelector('code')!.textContent!,
  ) as Array<{role: string; content: string}>
  expect(messages.map((message) => message.role)).toEqual(['system', 'user'])
  expect(messages[1].content).toContain('재물에 대해 알려줘')
  expect(JSON.parse(messages[1].content)).toMatchObject({birth: {date: '1995-03-17'}})
  expect(messages[1].content).toContain('"재성"')
  expect(messages[1].content).toContain('"金"')
})

it('should require a birth date without retaining a previous result', () => {
  render(() => <SajuPage />)

  const form = screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!
  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '재물에 대해 알려줘'}})
  fireEvent.submit(form)
  expect(screen.getByRole('heading', {name: '오행 · analyzeElements()'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button', {name: '선택 지우기'}))
  fireEvent.submit(form)

  expect(screen.getByRole('alert').textContent).toContain('생년월일')
  expect(screen.queryByRole('heading', {name: '오행 · analyzeElements()'})).toBeNull()
  expect(screen.queryByRole('region', {name: 'LLM 전달 값'})).toBeNull()
})

it('should pass a lunar birth date and leap-month choice to the calculation', () => {
  render(() => <SajuPage />)

  fireEvent.change(screen.getByLabelText('달력'), {target: {value: 'lunar'}})
  fireEvent.change(screen.getByRole('combobox', {name: '음력 일'}), {target: {value: '17'}})
  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '재물에 대해 알려줘'}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  const messages = JSON.parse(
    screen.getByRole('region', {name: 'LLM 전달 값'}).querySelector('code')!.textContent!,
  ) as Array<{content: string}>
  expect(JSON.parse(messages[1].content)).toMatchObject({
    birth: {calendar: 'lunar', date: '1995-03-17', isLeapMonth: false},
  })
})

it('should require a meaningful question before preparing LLM messages', () => {
  render(() => <SajuPage />)

  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '   '}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  expect(screen.getByRole('alert').textContent).toContain('질문')
  expect(screen.queryByRole('region', {name: 'LLM 전달 값'})).toBeNull()
})

it('should explain that annual fortune cannot be calculated instead of starting a reading', () => {
  render(() => <SajuPage />)

  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '2026년 취업운은 어떤가요?'}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  expect(screen.getByText(/특정 연도 운세는 계산하지 않아요/u)).toBeTruthy()
  expect(screen.queryByRole('region', {name: 'LLM 전달 값'})).toBeNull()
  expect(screen.getByRole('heading', {name: '사주팔자 · deriveSaju()'})).toBeTruthy()
})

it('should ask for a specific topic instead of generating an unsupported broad future prediction', () => {
  render(() => <SajuPage />)

  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '나의 미래는 ?'}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  expect(screen.getByRole('region', {name: '계산값 답변'}).textContent).toContain('재물, 일, 관계')
  expect(screen.queryByRole('region', {name: 'LLM 전달 값'})).toBeNull()
  expect(screen.getByRole('heading', {name: '사주팔자 · deriveSaju()'})).toBeTruthy()
})

it('should omit daeun when its calculation input is unspecified', () => {
  render(() => <SajuPage />)

  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '제 성향은 어떤가요?'}})
  fireEvent.change(screen.getByLabelText('대운 계산 입력'), {target: {value: 'N'}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  const messages = JSON.parse(
    screen.getByRole('region', {name: 'LLM 전달 값'}).querySelector('code')!.textContent!,
  ) as Array<{content: string}>
  expect(JSON.parse(messages[1].content)).toMatchObject({daeun: null})
  expect(
    screen.getByRole('heading', {name: '대운 · analyzeDaeun()'}).nextElementSibling?.textContent,
  ).toBe('null')
})

it('should answer a direct day-pillar fact question without generating an interpretation', () => {
  render(() => <SajuPage />)

  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '제 일주는 무엇인가요?'}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  expect(screen.getByRole('region', {name: '계산값 답변'}).textContent).toContain('병오(丙午)')
  expect(screen.queryByRole('region', {name: 'LLM 전달 값'})).toBeNull()
})
