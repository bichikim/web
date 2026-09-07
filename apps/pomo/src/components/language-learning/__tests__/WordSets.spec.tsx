/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children: JSX.Element; readonly class?: string; readonly href: string}) => (
    <a class={props.class} href={props.href}>
      {props.children}
    </a>
  ),
}))

import {LanguageLearningWordSets} from '../WordSets'

it('should show the word set catalog page and Pomo return link', () => {
  render(() => <LanguageLearningWordSets />)

  expect(screen.getByRole('main')).toHaveClass('bg-background', 'text-foreground')
  expect(screen.getByRole('heading', {level: 1, name: '단어 세트 가져오기'})).toBeInTheDocument()
  expect(screen.getByRole('link', {name: '앱으로 돌아가기'})).toHaveAttribute('href', '/')
  expect(screen.getByRole('heading', {level: 2, name: '단어 세트'})).toBeInTheDocument()
  expect(screen.getByRole('tablist', {name: '단어 세트 언어'})).toBeInTheDocument()
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
    '전체',
    '한글',
    '영어',
    '일본어',
  ])
  expect(screen.queryByRole('heading', {level: 3})).toBeNull()
  expect(screen.getByText('가져올 수 있는 단어 세트를 준비 중이에요.')).toBeInTheDocument()
})

it('should render one mixed list and filter it by Hangul, English, or Japanese', () => {
  render(() => (
    <LanguageLearningWordSets
      sets={[
        {id: 'ko-basic', language: 'ko', title: '한글 기초'},
        {id: 'en-b1', language: 'en', title: 'English B1'},
        {id: 'ja-travel', language: 'ja', title: '일본 여행'},
        {id: 'en-b2', language: 'en', title: 'English B2'},
      ]}
    />
  ))

  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    '한글 기초한글',
    'English B1영어',
    '일본 여행일본어',
    'English B2영어',
  ])

  const englishTab = screen.getByRole('tab', {name: '영어'})
  fireEvent.click(englishTab)

  expect(englishTab).toHaveAttribute('aria-selected', 'true')
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'English B1영어',
    'English B2영어',
  ])

  fireEvent.click(screen.getByRole('tab', {name: '일본어'}))
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    '일본 여행일본어',
  ])

  fireEvent.click(screen.getByRole('tab', {name: '전체'}))
  expect(screen.getAllByRole('listitem')).toHaveLength(4)
})

it('should add a selected set and announce added and skipped word counts', () => {
  const onAddSet = vi
    .fn()
    .mockReturnValueOnce({addedCount: 98, skippedCount: 2})
    .mockReturnValueOnce({addedCount: 0, skippedCount: 100})
  render(() => (
    <LanguageLearningWordSets
      onAddSet={onAddSet}
      sets={[
        {id: 'english-b1', language: 'en', title: 'English B1'},
        {id: 'english-b2', language: 'en', title: 'English B2'},
      ]}
    />
  ))

  const addButton = screen.getByRole('button', {name: 'English B1 추가'})
  fireEvent.click(addButton)

  expect(onAddSet).toHaveBeenLastCalledWith('english-b1')
  expect(
    screen.getByRole('status', {
      name: 'English B1 단어 98개를 추가하고, 중복 2개를 제외했어요.',
    }),
  ).toBeInTheDocument()

  fireEvent.click(addButton)

  expect(
    screen.getByRole('status', {name: 'English B1 단어는 이미 모두 추가되어 있어요.'}),
  ).toBeInTheDocument()
})
