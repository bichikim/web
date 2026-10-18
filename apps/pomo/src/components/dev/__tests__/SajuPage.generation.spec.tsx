/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {For, type JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {supportsTextModel} from 'src/features/text-generation'
import {createWorkerTransport} from 'src/utils/worker-transport'
import {SajuPage} from '../SajuPage'

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

vi.mock('src/features/text-generation', () => ({supportsTextModel: vi.fn()}))
vi.mock('src/utils/worker-transport', () => ({createWorkerTransport: vi.fn()}))

const send = vi.fn()
const dispose = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supportsTextModel).mockReturnValue(true)
  vi.mocked(createWorkerTransport).mockReturnValue({dispose, send})
  vi.stubGlobal('Worker', class {})
})

afterEach(async () => {
  // Rendering a reading starts a clientOnly import; drain it before tearing down the environment.
  await vi.dynamicImportSettled()
  cleanup()
  vi.unstubAllGlobals()
})

it('should send displayed messages through the real generation workspace', async () => {
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
  await vi.dynamicImportSettled()
  expect(send).toHaveBeenCalledExactlyOnceWith({
    messages,
    type: 'generate',
  })
})

it('should dispose real generation when an invalid lunar date removes the reading', async () => {
  render(() => <SajuPage />)

  const form = screen.getByRole('button', {name: '사주 풀이 생성'}).closest('form')!
  fireEvent.input(screen.getByLabelText('질문'), {target: {value: '재물에 대해 알려줘'}})
  fireEvent.submit(form)
  await vi.dynamicImportSettled()
  expect(send).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('radio', {name: '음력'}))
  fireEvent.click(screen.getByRole('checkbox', {name: '윤달'}))
  expect(screen.queryByRole('combobox', {name: '음력 일'})).toBeNull()
  fireEvent.submit(form)

  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByRole('heading', {name: '오행 · analyzeElements()'})).toBeNull()
  expect(screen.queryByRole('region', {name: 'LLM 전달 값'})).toBeNull()
  expect(dispose).toHaveBeenCalledOnce()
})
