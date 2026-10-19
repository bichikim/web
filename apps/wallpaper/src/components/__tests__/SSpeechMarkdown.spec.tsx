/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {SSpeechMarkdown} from '../SSpeechMarkdown'

afterEach(cleanup)
it('should render emphasis, inline code, fenced code and GFM tables as separate semantic elements', () => {
  const source = [
    '**굵은 글씨**와 `inline()`',
    '```ts\nconst value = "<div>"\n```',
    '| 이름 | 값 |\n| --- | ---: |\n| **강조** | `42` |',
  ].join('\n\n')
  const view = render(() => <SSpeechMarkdown source={source} wrap />)
  expect(view.container.querySelector('strong')).toHaveTextContent('굵은 글씨')
  expect(view.container.querySelector('p code')).toHaveTextContent('inline()')
  expect(screen.getByRole('region', {name: 'ts 코드'})).toHaveTextContent('const value = "<div>"')
  expect(screen.getAllByRole('columnheader')).toHaveLength(2)
  expect(screen.getByRole('cell', {name: '강조'}).querySelector('strong')).not.toBeNull()
  expect(screen.getByRole('cell', {name: '42'}).querySelector('code')).not.toBeNull()
})
it('should display raw HTML as text without injecting markup or fetching remote images', () => {
  const view = render(() => (
    <SSpeechMarkdown
      source={
        '<script>danger()</script>\n\n![그림](https://example.test/image.png)\n\n`<b>text</b>`'
      }
    />
  ))
  expect(view.container.querySelector('script')).toBeNull()
  expect(view.container.querySelector('img')).toBeNull()
  expect(view.container).toHaveTextContent('<script>danger()</script>')
  expect(view.container).toHaveTextContent('그림')
})
