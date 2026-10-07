/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {SajuPage} from '../components/dev/SajuPage'
import {getReadingTopics} from '../components/dev/saju/get-reading-topics'
import {requiresAnnualReading} from '../components/dev/saju/requires-annual-reading'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))

afterEach(cleanup)

const CAREER_WITH_RELATIVE_YEAR = '지난 해에 시작한 일이 나한테 맞을까?'

it('should not treat a career question that only mentions a past year as annual fortune', () => {
  expect(getReadingTopics(CAREER_WITH_RELATIVE_YEAR)).toContain('career')
  expect(requiresAnnualReading(CAREER_WITH_RELATIVE_YEAR)).toBe(false)
})

it('should start a career reading instead of the annual-fortune notice on SajuPage', () => {
  render(() => <SajuPage />)

  fireEvent.input(screen.getByLabelText('질문'), {target: {value: CAREER_WITH_RELATIVE_YEAR}})
  fireEvent.submit(screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!)

  expect(screen.queryByText(/특정 연도 운세는 계산하지 않아요/u)).toBeNull()
  expect(screen.getByRole('region', {name: 'LLM 전달 값'})).toBeTruthy()
})
