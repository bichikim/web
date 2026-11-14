import './LanguageSelect.spec'
import {render, screen} from '@solidjs/testing-library'
import {userEvent} from 'vitest/browser'
import {createComponent, createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {LanguageLearningLanguage} from '../../../features/language-learning/schema'
import {LanguageLearningLanguageSelect} from '../LanguageSelect'

it('should select through the visible menu and retain the controlled trigger', async () => {
  const [language, setLanguage] = createSignal<LanguageLearningLanguage>('en')
  const onChange = vi.fn((value: LanguageLearningLanguage) => setLanguage(value))
  render(() =>
    createComponent(LanguageLearningLanguageSelect, {
      onChange,
      get value() {
        return language()
      },
    }),
  )
  const trigger = screen.getByRole('button', {name: '학습 언어 영어'})

  await userEvent.click(trigger)
  await userEvent.click(screen.getByRole('option', {name: '일본어'}))

  expect(onChange).toHaveBeenCalledExactlyOnceWith('ja')
  expect(screen.getByRole('button', {name: '학습 언어 일본어'})).toBe(trigger)
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})
