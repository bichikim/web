/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {For, type JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {GenerationWorkspace} from '../saju/GenerationWorkspace'
import {SajuPage} from '../SajuPage'

vi.mock('../saju/GenerationWorkspace', () => ({GenerationWorkspace: vi.fn()}))
vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('../../p-select/PSelect', () => ({
  PSelect: (props: {
    accessibleLabel?: string
    label: string
    onChange: (value: string) => void
    options: ReadonlyArray<{label: string; value: string}>
    value: string
  }) => (
    <select
      aria-label={props.accessibleLabel ?? props.label}
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
afterEach(vi.clearAllMocks)

it.each([
  '1995년 생의 성향은 어떤가요?',
  '지난 해에 시작한 일이 나한테 맞을까?',
  '2024년에 시작한 일이 나한테 맞을까?',
  '지난 해에 시작한 일이 나한테 맞을까? 어려운 일이라 고민돼요.',
  '2026년 취업운은 어떤가요?',
  '지난 해에 시작한 일이 나한테 맞을까? 운세를 알려줘',
  '지난 해에 시작한 일이 나한테 맞을까? 운세에 대해 알려줘',
  '작년에 시작한 직장 운은 어땠나요?',
  '작년에 시작한 직장 이직운은 어떤가요?',
  '지난 해에 시작한 직장이 나한테 맞을까? 금전운은?',
  '지난 해에 시작한 직장이 나한테 맞을까? 연애운은?',
  '지난 해에 시작한 직장이 나한테 맞을까? 결혼운은?',
  '지난 해에 시작한 직장이 나한테 맞을까? 건강운은?',
  '지난 해에 시작한 직장이 나한테 맞을까? 직장운은?',
])('should send the original question and reading themes for a time reference: %s', (question) => {
  render(() => <SajuPage />)

  fireEvent.input(screen.getByRole('textbox', {name: '질문'}), {target: {value: question}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  const region = screen.getByRole('region', {name: 'LLM 전달 값'})
  const [system, user] = JSON.parse(region.querySelector('code')!.textContent!) as ReadonlyArray<{
    content: string
    role: string
  }>

  expect(system.role).toBe('system')
  expect(system.content).toContain(
    '특정 날짜나 해의 운세를 직접 묻는 경우 그 기간은 계산할 수 없다고',
  )
  const facts = JSON.parse(system.content.split('사주 계산값: ').at(-1)!)
  expect(facts).toEqual({'생활 단서': expect.arrayContaining([expect.any(String)])})
  expect(user).toEqual({content: question, role: 'user'})
  expect(GenerationWorkspace).toHaveBeenCalledExactlyOnceWith({messages: [system, user]})
})
