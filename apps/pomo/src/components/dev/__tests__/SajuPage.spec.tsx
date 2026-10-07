/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {GenerationWorkspace} from '../saju/GenerationWorkspace'
import {SajuPage} from '../SajuPage'

// Keep model imports and worker startup outside the page's calculation tests.
vi.mock('../saju/GenerationWorkspace', () => ({GenerationWorkspace: vi.fn()}))
vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))

afterEach(cleanup)
afterEach(vi.clearAllMocks)

it('should calculate and display each k-saju result for the entered birth', () => {
  render(() => <SajuPage />)

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
  expect(messages[1].content).toContain('"재성"')
  expect(messages[1].content).toContain('"金"')
  expect(GenerationWorkspace).toHaveBeenCalledExactlyOnceWith({
    facts: {birthYear: 1995},
    fallbackAnswer: expect.any(String),
    messages,
  })
})

it('should report an invalid date without retaining a previous result', () => {
  render(() => <SajuPage />)

  const form = screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!
  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '재물에 대해 알려줘'}})
  fireEvent.submit(form)
  expect(screen.getByRole('region', {name: 'LLM 전달 값'})).toBeTruthy()
  expect(GenerationWorkspace).toHaveBeenCalledOnce()
  fireEvent.input(screen.getByLabelText('생년월일'), {target: {value: '1899-01-01'}})
  fireEvent.submit(form)

  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByRole('heading', {name: '오행 · analyzeElements()'})).toBeNull()
  expect(screen.queryByRole('region', {name: 'LLM 전달 값'})).toBeNull()
  expect(GenerationWorkspace).toHaveBeenCalledOnce()
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
  expect(GenerationWorkspace).not.toHaveBeenCalled()
})

it('should ask for a specific topic instead of generating an unsupported broad future prediction', () => {
  render(() => <SajuPage />)

  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '나의 미래는 ?'}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  expect(screen.getByRole('region', {name: '계산값 답변'}).textContent).toContain('재물, 일, 관계')
  expect(screen.queryByRole('region', {name: 'LLM 전달 값'})).toBeNull()
  expect(screen.getByRole('heading', {name: '사주팔자 · deriveSaju()'})).toBeTruthy()
  expect(GenerationWorkspace).not.toHaveBeenCalled()
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
  expect(GenerationWorkspace).not.toHaveBeenCalled()
})
