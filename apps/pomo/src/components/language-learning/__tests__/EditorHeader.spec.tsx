/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children: JSX.Element; readonly class?: string; readonly href: string}) => (
    <a class={props.class} href={props.href}>
      {props.children}
    </a>
  ),
}))

import {LanguageLearningEditorHeader} from '../EditorHeader'

it('should show the editor title and Pomo root return link', () => {
  render(() => <LanguageLearningEditorHeader />)

  expect(screen.getByRole('heading', {name: '언어 학습 문장 만들기'})).toBeInTheDocument()
  expect(screen.getByRole('link', {name: 'Pomofi로'})).toHaveAttribute('href', '/')
})
