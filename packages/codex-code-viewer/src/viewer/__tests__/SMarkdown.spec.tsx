/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {SMarkdown} from '../SMarkdown'

describe('SMarkdown', () => {
  afterEach(cleanup)
  it('should render headings, GFM tables and checked tasks', () => {
    render(() => (
      <SMarkdown
        source={'# 안내\n\n- [x] 완료\n\n| 이름 | 값 |\n| --- | --- |\n| 뷰어 | 1 |'}
        path="README.md"
      />
    ))
    expect(screen.getByRole('heading', {level: 1, name: '안내'})).toBeTruthy()
    expect(screen.getByRole('table').textContent).toContain('뷰어')
    expect(screen.getByRole('columnheader', {name: '이름'})).toBeTruthy()
    expect(screen.getByRole('checkbox')).toHaveProperty('checked', true)
  })
  it('should display MDX expressions and imports without executing them', () => {
    render(() => (
      <SMarkdown
        source={
          'import Box from "./box"\n\n# 문서\n\n{globalThis.alert("executed")}\n\n<Box>내용</Box>'
        }
        path="README.mdx"
      />
    ))
    expect(screen.getByRole('heading', {name: '문서'})).toBeTruthy()
    expect(screen.getByText('{globalThis.alert("executed")}')).toBeTruthy()
    expect(screen.getByText('import Box from "./box"')).toBeTruthy()
    expect(screen.getByText('내용')).toBeTruthy()
  })
  it('should follow local links and reject executable URLs and raw HTML', () => {
    const open = vi.fn()
    render(() => (
      <SMarkdown
        source={
          '[다음](../next.md)\n\n[실행](javascript:alert%281%29)\n\n<script>alert(1)</script>'
        }
        path="docs/README.md"
        onOpen={open}
      />
    ))
    fireEvent.click(screen.getByRole('link', {name: '다음'}))
    expect(open).toHaveBeenCalledWith({column: 1, line: 1, path: 'next.md'})
    expect(screen.queryByRole('link', {name: '실행'})).toBeNull()
    expect(document.querySelector('script')).toBeNull()
  })
})
