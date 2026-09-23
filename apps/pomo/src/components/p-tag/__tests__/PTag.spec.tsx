/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {PTag} from '../PTag'

describe('PTag', () => {
  it('should render the neutral small tag by default', () => {
    const result = render(() => <PTag>AI 음성</PTag>)
    const tag = result.getByText('AI 음성')

    expect(tag.tagName).toBe('SPAN')
    expect(tag.classList).toContain('whitespace-nowrap')
    expect(tag.classList).toContain('bg-secondary-soft')
    expect(tag.classList).toContain('text-sm')
    expect(tag.classList).toContain('leading-5')
  })

  it('should render explicit size and tone variants with consumer classes', () => {
    const result = render(() => (
      <PTag class="consumer-tag" size="medium" tone="danger">
        오류
      </PTag>
    ))
    const tag = result.getByText('오류')

    expect(tag.classList).toContain('consumer-tag')
    expect(tag.classList).toContain('text-sm')
    expect(tag.classList).toContain('leading-5')
    expect(tag.classList).toContain('text-danger')
  })
})
