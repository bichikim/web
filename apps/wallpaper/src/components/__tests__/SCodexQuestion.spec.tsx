/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {SCodexQuestion} from '../SCodexQuestion'

afterEach(cleanup)
const request = {
  id: 'request-one',
  questions: [
    {id: 'color', options: [{description: '밝은 색', label: '파랑'}], question: '어떤 색상인가요?'},
  ],
  sessionId: 'chat-one',
  turnId: 'turn-one',
}
it('should accept question IDs that match JavaScript object property names', async () => {
  const answer = vi.fn().mockResolvedValue(undefined)
  render(() => (
    <SCodexQuestion
      request={{...request, questions: [{id: 'constructor', options: [], question: '내용'}]}}
      onAnswer={answer}
    />
  ))
  expect(screen.getByRole('button', {name: '답변 보내기'})).toBeDisabled()
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '확인'}})
  fireEvent.click(screen.getByRole('button', {name: '답변 보내기'}))
  await Promise.resolve()
  expect(answer).toHaveBeenCalledExactlyOnceWith('request-one', {constructor: '확인'})
})
it('should send the selected option to only its request', async () => {
  const answer = vi.fn().mockResolvedValue(undefined)
  render(() => <SCodexQuestion request={request} onAnswer={answer} />)
  expect(screen.getByRole('button', {name: '답변 보내기'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '파랑 밝은 색'}))
  fireEvent.click(screen.getByRole('button', {name: '답변 보내기'}))
  await Promise.resolve()
  expect(answer).toHaveBeenCalledExactlyOnceWith('request-one', {color: '파랑'})
})
it('should keep choices and direct input outside the scrolling question content', () => {
  render(() => <SCodexQuestion request={request} />)
  const content = screen.getByRole('region', {name: '질문 내용'})
  const choices = screen.getByRole('region', {name: '답변 선택'})
  expect(content).toHaveTextContent('어떤 색상인가요?')
  expect(content.contains(screen.getByRole('button', {name: '파랑 밝은 색'}))).toBe(false)
  expect(choices.contains(screen.getByRole('textbox'))).toBe(true)
  expect(choices.contains(screen.getByRole('button', {name: '답변 보내기'}))).toBe(false)
})
it('should retain separate answers for multiple questions in the shared footer', async () => {
  const answer = vi.fn().mockResolvedValue(undefined)
  render(() => (
    <SCodexQuestion
      request={{
        ...request,
        questions: [...request.questions, {id: 'size', options: [], question: '크기는 어떤가요?'}],
      }}
      onAnswer={answer}
    />
  ))
  const submit = screen.getByRole('button', {name: '답변 보내기'})
  fireEvent.click(screen.getByRole('button', {name: '파랑 밝은 색'}))
  expect(submit).toBeDisabled()
  fireEvent.input(screen.getByRole('textbox', {name: '크기는 어떤가요? 답변'}), {
    target: {value: '크게'},
  })
  fireEvent.click(submit)
  await Promise.resolve()
  expect(answer).toHaveBeenCalledExactlyOnceWith('request-one', {color: '파랑', size: '크게'})
})
it('should preserve a free text draft on failure and prevent duplicate submissions', async () => {
  const answer = vi.fn().mockRejectedValue(new Error('expired'))
  render(() => <SCodexQuestion request={request} onAnswer={answer} />)
  fireEvent.input(screen.getByRole('textbox', {name: '어떤 색상인가요? 답변'}), {
    target: {value: '초록'},
  })
  fireEvent.click(screen.getByRole('button', {name: '답변 보내기'}))
  fireEvent.click(screen.getByRole('button', {name: '답변 보내기'}))
  await Promise.resolve()
  expect(answer).toHaveBeenCalledExactlyOnceWith('request-one', {color: '초록'})
  expect(screen.getByRole('alert')).toHaveTextContent('질문이 종료됐거나 연결이 끊겼습니다.')
  expect(screen.getByRole('textbox')).toHaveValue('초록')
})

it('should keep drafts and focused elements when notification snapshots replace request objects', () => {
  const [current, setCurrent] = createSignal(request)
  render(() => <SCodexQuestion request={current()} />)
  const input = screen.getByRole('textbox')
  const choice = screen.getByRole('button', {name: '파랑 밝은 색'})
  fireEvent.input(input, {target: {value: '초록'}})
  input.focus()
  setCurrent(structuredClone(request))
  expect(screen.getByRole('textbox')).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(input).toHaveValue('초록')
  expect(screen.getByRole('button', {name: '파랑 밝은 색'})).toBe(choice)
})
