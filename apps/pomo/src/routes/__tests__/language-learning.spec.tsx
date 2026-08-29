/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import LanguageLearningPage from '../language-learning'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children: JSX.Element}) => <span data-testid="page-title">{props.children}</span>,
}))
vi.mock('../../components/language-learning/EditorContent', () => ({
  LanguageLearningEditorContent: () => <div>language learning editor</div>,
}))

it('should render the language learning editor page', () => {
  render(() => <LanguageLearningPage />)

  expect(screen.getByTestId('page-title')).toHaveTextContent('Pomofi — 언어 학습 문장 만들기')
  expect(screen.getByText('language learning editor')).toBeInTheDocument()
})
