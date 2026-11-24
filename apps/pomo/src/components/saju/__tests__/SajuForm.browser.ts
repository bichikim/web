import {cleanup, render, screen} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {userEvent} from 'vitest/browser'
import {sajuFormDraftPersistence} from '../../../features/saju/form-draft-storage'
import {SajuForm} from '../SajuForm'

afterEach(cleanup)

it('should keep the latest shared question after another browser document edits the draft', async () => {
  const key = 'pomo:saju:form-draft:v1'
  sajuFormDraftPersistence.delete()
  render(() =>
    createComponent(SajuForm, {
      draftPersistence: sajuFormDraftPersistence,
      onSubmit: () => undefined,
    }),
  )
  const frame = document.createElement('iframe')
  document.body.append(frame)
  try {
    const question = screen.getByRole<HTMLTextAreaElement>('textbox', {name: '질문'})
    await userEvent.fill(question, '첫 질문')
    const draft = sajuFormDraftPersistence.read()
    frame.contentWindow!.localStorage.setItem(
      key,
      JSON.stringify({...draft, question: '다른 탭 질문'}),
    )
    await expect.poll(() => question.value).toBe('다른 탭 질문')
    await userEvent.fill(question, '다른 탭 질문 뒤에 덧붙임')
    expect(sajuFormDraftPersistence.read()?.question).toBe('다른 탭 질문 뒤에 덧붙임')
  } finally {
    frame.remove()
    sajuFormDraftPersistence.delete()
  }
})
