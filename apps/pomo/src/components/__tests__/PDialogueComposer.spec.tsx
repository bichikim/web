/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {PDialogueComposer} from '../PDialogueComposer'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'

const originalGetLocale = getLocale

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should expand the initial dialogue button into a focused input', async () => {
  const {container} = render(() => <PDialogueComposer />)

  const trigger = screen.getByRole('button', {name: '대화 시작하기'})
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('textbox', {name: '대화 입력'})).not.toBeInTheDocument()

  fireEvent.click(trigger)

  const input = screen.getByRole('textbox', {name: '대화 입력'})
  const composer = container.querySelector('.pomo-dialogue-composer')
  expect(input).toHaveAttribute('placeholder', '어떤 대화를 나눌까요?')
  expect(input).toHaveValue('')
  expect(composer).toHaveClass('[&[data-expanded]]:w-full', '[&[data-expanded]]:[flex:none]')
  expect(composer).toHaveClass('[&[data-expanded]]:self-start')
  expect(composer).toHaveClass('self-end', 'sm:self-start')
  expect(composer).not.toHaveClass('[&[data-expanded]]:[flex:1_1_36rem]')
  expect(composer).not.toHaveClass('[&[data-expanded]]:w-[min(36rem,_100%)]')
  expect(composer).toHaveClass('focus-within:border-highlight')
  expect(composer).not.toHaveClass('focus-within:shadow-focus')
  await waitFor(() => expect(input).toHaveFocus())
})

it('should localize the dialogue placeholder in English', () => {
  overwriteGetLocale(() => 'en')
  render(() => <PDialogueComposer />)

  fireEvent.click(screen.getByRole('button', {name: 'Start a conversation'}))

  expect(screen.getByRole('textbox', {name: 'Dialogue input'})).toHaveAttribute(
    'placeholder',
    'What would you like to talk about?',
  )
  expect(screen.getByRole('button', {name: 'Send dialogue'})).toBeDisabled()
})

it('should auto-expand once without moving focus', async () => {
  const [autoExpand, setAutoExpand] = createSignal(false)
  render(() => <PDialogueComposer autoExpand={autoExpand()} />)

  expect(screen.queryByRole('textbox', {name: '대화 입력'})).not.toBeInTheDocument()

  setAutoExpand(true)

  const input = await screen.findByRole('textbox', {name: '대화 입력'})
  expect(input).not.toHaveFocus()

  fireEvent.blur(input)
  expect(screen.getByRole('textbox', {name: '대화 입력'})).toBeInTheDocument()

  setAutoExpand(false)
  fireEvent.keyDown(input, {key: 'Escape'})
  expect(screen.getByRole('button', {name: '대화 시작하기'})).toBeInTheDocument()

  setAutoExpand(true)

  expect(await screen.findByRole('textbox', {name: '대화 입력'})).not.toHaveFocus()
})

it('should collapse an untouched mobile composer when media messages appear', async () => {
  const [autoExpand, setAutoExpand] = createSignal(true)
  render(() => <PDialogueComposer autoExpand={autoExpand()} />)

  expect(await screen.findByRole('textbox', {name: '대화 입력'})).not.toHaveFocus()

  setAutoExpand(false)

  expect(screen.getByRole('button', {name: '대화 시작하기'})).toBeInTheDocument()
})

it('should keep a focused or drafted mobile composer open when media messages appear', async () => {
  const [autoExpand, setAutoExpand] = createSignal(true)
  render(() => <PDialogueComposer autoExpand={autoExpand()} />)
  const input = await screen.findByRole('textbox', {name: '대화 입력'})

  input.focus()
  setAutoExpand(false)
  expect(input).toBeInTheDocument()

  fireEvent.input(input, {target: {value: '이어 쓸 대화'}})
  input.blur()
  expect(input).toBeInTheDocument()
})

it('should submit trimmed dialogue text, clear it, and restore input focus', async () => {
  const onSubmit = vi.fn()
  const [loading, setLoading] = createSignal(false)
  render(() => (
    <PDialogueComposer
      loading={loading()}
      onSubmit={(text) => {
        onSubmit(text)
        setLoading(true)
      }}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '대화 시작하기'}))
  const input = screen.getByRole('textbox', {name: '대화 입력'})
  const button = screen.getByRole('button', {name: '대화 보내기'})

  expect(button).toBeDisabled()

  fireEvent.input(input, {target: {value: '  오늘은 무엇을 할까?  '}})
  expect(button).toBeEnabled()
  button.focus()
  expect(button).toHaveFocus()
  fireEvent.click(button)

  expect(onSubmit).toHaveBeenCalledWith('오늘은 무엇을 할까?')
  await waitFor(() => expect(input).toHaveValue(''))
  await waitFor(() => expect(input).toHaveFocus())
})

it('should preserve the submitted draft when the submission is rejected', async () => {
  const onSubmit = vi.fn(async () => false)
  render(() => <PDialogueComposer onSubmit={onSubmit} />)
  fireEvent.click(screen.getByRole('button', {name: '대화 시작하기'}))
  const input = screen.getByRole('textbox', {name: '대화 입력'})
  fireEvent.input(input, {target: {value: '남겨 둘 대화'}})

  fireEvent.click(screen.getByRole('button', {name: '대화 보내기'}))

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('남겨 둘 대화'))
  expect(input).toHaveValue('남겨 둘 대화')
  await waitFor(() => expect(input).toHaveFocus())
})

it('should keep focus and accept the next draft while dialogue creation is busy', async () => {
  const [loading, setLoading] = createSignal(false)
  const onSubmit = vi.fn()
  const {container} = render(() => <PDialogueComposer loading={loading()} onSubmit={onSubmit} />)
  fireEvent.click(screen.getByRole('button', {name: '대화 시작하기'}))
  const input = screen.getByRole('textbox', {name: '대화 입력'})
  await waitFor(() => expect(input).toHaveFocus())

  setLoading(true)

  expect(input).toHaveFocus()
  expect(input).not.toHaveAttribute('readonly')
  expect(input).toBeEnabled()
  fireEvent.input(input, {target: {value: '다음에 보낼 대화'}})
  expect(input).toHaveValue('다음에 보낼 대화')
  const submitButton = screen.getByRole('button', {name: '대화 준비 중'})
  expect(submitButton).toBeDisabled()
  fireEvent.submit(container.querySelector('.pomo-dialogue-composer')!)
  expect(onSubmit).not.toHaveBeenCalled()
  expect(submitButton.querySelector('.i-tabler-loader-2')).toHaveClass('animate-spin')
  expect(container.querySelector('.pomo-dialogue-composer')).toHaveAttribute('aria-busy', 'true')
})

it('should replace the collapsed dialogue button with a disabled loading indicator', () => {
  const {container} = render(() => <PDialogueComposer loading />)

  const trigger = screen.getByRole('button', {name: '대화 준비 중'})
  expect(trigger).toBeDisabled()
  expect(trigger.querySelector('.i-tabler-loader-2')).toHaveClass('animate-spin')
  expect(container.querySelector('.pomo-dialogue-composer')).toHaveAttribute('aria-busy', 'true')
})

it('should collapse an empty input after focus leaves the composer', () => {
  render(() => <PDialogueComposer />)
  fireEvent.click(screen.getByRole('button', {name: '대화 시작하기'}))

  fireEvent.blur(screen.getByRole('textbox', {name: '대화 입력'}))

  expect(screen.getByRole('button', {name: '대화 시작하기'})).toBeInTheDocument()
})

it('should preserve a draft while focus moves away or the composer is reopened', () => {
  render(() => <PDialogueComposer />)
  fireEvent.click(screen.getByRole('button', {name: '대화 시작하기'}))
  const input = screen.getByRole('textbox', {name: '대화 입력'})
  fireEvent.input(input, {target: {value: '이어 쓸 대화'}})

  fireEvent.blur(input)
  expect(input).toBeInTheDocument()

  fireEvent.keyDown(input, {key: 'Escape'})
  fireEvent.click(screen.getByRole('button', {name: '대화 시작하기'}))

  expect(screen.getByRole('textbox', {name: '대화 입력'})).toHaveValue('이어 쓸 대화')
})

it('should collapse an empty composer when a non-focusable outside area is pressed', async () => {
  render(() => (
    <>
      <div data-testid="scene" />
      <PDialogueComposer />
    </>
  ))
  fireEvent.click(screen.getByRole('button', {name: '대화 시작하기'}))
  const input = screen.getByRole('textbox', {name: '대화 입력'})
  await waitFor(() => expect(input).toHaveFocus())

  fireEvent.pointerDown(screen.getByTestId('scene'))

  expect(screen.getByRole('button', {name: '대화 시작하기'})).toBeInTheDocument()
})

it('should remove focus without discarding a draft when the scene is pressed', async () => {
  render(() => (
    <>
      <div data-testid="scene" />
      <PDialogueComposer />
    </>
  ))
  fireEvent.click(screen.getByRole('button', {name: '대화 시작하기'}))
  const input = screen.getByRole('textbox', {name: '대화 입력'})
  fireEvent.input(input, {target: {value: '남겨 둘 대화'}})
  await waitFor(() => expect(input).toHaveFocus())

  fireEvent.pointerDown(screen.getByTestId('scene'))

  expect(input).not.toHaveFocus()
  expect(input).toHaveValue('남겨 둘 대화')
})
