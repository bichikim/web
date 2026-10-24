/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {AiConversationPage} from '../AiConversationPage'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children?: JSX.Element}) => <>{props.children}</>,
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('src/components/character-studio/TrainViewportCanvas', () => ({
  TrainViewportCanvas: (props: {modelUrl: string; trainCabin?: boolean}) => (
    <canvas
      data-model-url={props.modelUrl}
      data-train-cabin={props.trainCabin}
      data-testid="character-canvas"
    />
  ),
}))

it('should render the full-page AI conversation scene with its character canvas', () => {
  render(() => <AiConversationPage />)

  expect(screen.getByRole('heading', {name: 'AI끼리 대화'})).toBeInTheDocument()
  expect(screen.getByTestId('character-canvas')).toBeInTheDocument()
  expect(screen.getByTestId('character-canvas')).toHaveAttribute('data-train-cabin', 'true')
  expect(screen.getByRole('link', {name: 'CC BY 4.0'})).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by/4.0/',
  )
  expect(screen.getByTestId('character-canvas')).toHaveAttribute(
    'data-model-url',
    expect.stringContaining('renderer=babylon-1'),
  )
  expect(screen.getByRole('link', {name: /실험실 목록/u})).toHaveAttribute('href', '/dev')
  expect(screen.getByText('다음 단계: 두 AI 대화 연결')).toBeInTheDocument()
})

it('should start with Haru and switch between both character assets', () => {
  render(() => <AiConversationPage />)
  fireEvent.click(screen.getByText('캐릭터 설정'))

  const selector = screen.getByRole('combobox', {name: '표정 조절 대상 · 하루와 루나'})
  const canvas = screen.getByTestId('character-canvas')
  expect(selector).toHaveValue('haru')
  expect(canvas).toHaveAttribute('data-model-url', expect.stringContaining('/haru.vrm'))
  expect(screen.queryByText('얼굴 변형')).not.toBeInTheDocument()

  fireEvent.change(selector, {target: {value: 'luna'}})
  expect(canvas).toHaveAttribute('data-model-url', expect.stringContaining('/vroid.glb'))
  expect(screen.getByText('얼굴 변형')).toBeInTheDocument()

  fireEvent.change(selector, {target: {value: 'haru'}})
  expect(canvas).toHaveAttribute('data-model-url', expect.stringContaining('/haru.vrm'))
  expect(screen.queryByText('얼굴 변형')).not.toBeInTheDocument()
})
