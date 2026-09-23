/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'
import {WebsiteBackground} from '../WebsiteBackground'

it('should render the supplied website URL as a full-size iframe', () => {
  render(() => <WebsiteBackground url="https://example.com/dashboard" />)

  const frame = screen.getByTitle('웹사이트 주소')
  expect(frame).toHaveAttribute('src', 'https://example.com/dashboard')
  expect(frame).toHaveClass('h-full', 'w-full')
})
