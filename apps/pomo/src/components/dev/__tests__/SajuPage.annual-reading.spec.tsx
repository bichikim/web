/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
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

afterEach(cleanup)
afterEach(vi.clearAllMocks)

it.each(['지난 해에 시작한 일이 나한테 맞을까?', '2024년에 시작한 일이 나한테 맞을까?'])(
  'should submit a career question with year context to mocked generation: %s',
  (question) => {
    render(() => <SajuPage />)

    fireEvent.input(screen.getByLabelText('질문'), {target: {value: question}})
    fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

    expect(screen.queryByRole('note')).toBeNull()
    const region = screen.getByRole('region', {name: 'LLM 전달 값'})
    const messages = JSON.parse(region.querySelector('code')!.textContent!) as Array<{
      content: string
      role: string
    }>
    expect(JSON.parse(messages[1].content)).toMatchObject({question})
    expect(GenerationWorkspace).toHaveBeenCalledExactlyOnceWith({
      facts: {birthYear: 1995},
      fallbackAnswer: expect.any(String),
      messages,
    })
  },
)

it('should keep showing the unsupported annual fortune notice for a career forecast', () => {
  render(() => <SajuPage />)

  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '2026년 취업운은 어떤가요?'}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  expect(screen.getByText(/특정 연도 운세는 계산하지 않아요/u)).toBeTruthy()
  expect(screen.queryByRole('region', {name: 'LLM 전달 값'})).toBeNull()
  expect(GenerationWorkspace).not.toHaveBeenCalled()
})
