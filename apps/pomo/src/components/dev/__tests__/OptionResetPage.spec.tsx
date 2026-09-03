/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {type JSX, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/PModal'
import type {OptionResetManager} from 'src/features/dev-option-reset'
import OptionResetPage from '../OptionResetPage'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('src/components/PModal', () => ({PModal: vi.fn()}))

const createManager = (): OptionResetManager => ({
  reset: vi.fn(async () => undefined),
  resetAll: vi.fn(async () => undefined),
})

beforeEach(() => {
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <Show when={props.isOpen}>
      <div aria-label={props.title} role="dialog">
        {props.children}
      </div>
    </Show>
  ))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should present every option group and the protected-data boundary', () => {
  render(() => <OptionResetPage manager={createManager()} />)

  expect(screen.getByRole('heading', {name: '각종 옵션 초기화'})).toBeInTheDocument()
  expect(screen.getByRole('heading', {name: '집중 공간'})).toBeInTheDocument()
  expect(screen.getByRole('heading', {name: '타이머'})).toBeInTheDocument()
  expect(screen.getByRole('heading', {name: '업데이트 안내'})).toBeInTheDocument()
  expect(
    screen.getByText(/로그인, 피드, 학습 문장, 재생목록, 모델 파일은 삭제하지 않아요/u),
  ).toBeInTheDocument()
})

it('should confirm and reset one option group', async () => {
  const manager = createManager()
  render(() => <OptionResetPage manager={manager} />)

  fireEvent.click(screen.getByRole('button', {name: '집중 공간 옵션 초기화'}))
  expect(screen.getByRole('dialog', {name: '옵션 초기화 확인'})).toHaveTextContent(
    '집중 공간 옵션을 초기화할까요?',
  )
  fireEvent.click(screen.getByRole('button', {name: '초기화'}))

  await waitFor(() => expect(manager.reset).toHaveBeenCalledWith('focus-room'))
  expect(await screen.findByRole('status')).toHaveTextContent('집중 공간 옵션을 초기화했습니다.')
})

it('should preserve options when confirmation is cancelled', () => {
  const manager = createManager()
  render(() => <OptionResetPage manager={manager} />)

  fireEvent.click(screen.getByRole('button', {name: '타이머 옵션 초기화'}))
  fireEvent.click(screen.getByRole('button', {name: '취소'}))

  expect(manager.reset).not.toHaveBeenCalled()
  expect(manager.resetAll).not.toHaveBeenCalled()
})

it('should confirm and reset all options', async () => {
  const manager = createManager()
  render(() => <OptionResetPage manager={manager} />)

  fireEvent.click(screen.getByRole('button', {name: '모든 옵션 초기화'}))
  expect(screen.getByRole('dialog', {name: '옵션 초기화 확인'})).toHaveTextContent(
    '모든 옵션을 초기화할까요?',
  )
  fireEvent.click(screen.getByRole('button', {name: '초기화'}))

  await waitFor(() => expect(manager.resetAll).toHaveBeenCalledOnce())
  expect(await screen.findByRole('status')).toHaveTextContent('모든 옵션을 초기화했습니다.')
})

it('should report a reset failure without claiming completion', async () => {
  const manager = createManager()
  vi.mocked(manager.reset).mockRejectedValue(new Error('blocked'))
  render(() => <OptionResetPage manager={manager} />)

  fireEvent.click(screen.getByRole('button', {name: '업데이트 안내 옵션 초기화'}))
  fireEvent.click(screen.getByRole('button', {name: '초기화'}))

  expect(await screen.findByRole('alert')).toHaveTextContent('옵션을 초기화하지 못했어요.')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
