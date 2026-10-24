/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {expect, it} from 'vitest'
import Home from '../index'

it('should expose the workspace and explain unavailable native actions in a browser', () => {
  const view = render(() => <Home />)
  expect(view.getByRole('heading', {name: '작게 잡고, 선명하게 전달하세요.'})).toBeDefined()
  expect(view.getByRole('button', {name: '이미지 열기'})).toBeDisabled()
  expect(
    view.getByText('캡처와 확대는 AI Director 데스크톱 앱에서 사용할 수 있습니다.'),
  ).toBeDefined()
})
