/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {PTag} from '../PTag'

describe('PTag', () => {
  it('should render the neutral small tag by default', () => {
    const result = render(() => <PTag>AI 음성</PTag>)
    const tag = result.getByText('AI 음성')

    expect(tag.getAttribute('data-pomo-tag')).toBe('')
    expect(tag.classList).toContain('whitespace-nowrap')
    expect(tag.classList).toContain('bg-secondary-soft')
    expect(tag.classList).toContain('text-[0.625rem]')
  })

  it('should render explicit size and tone variants with consumer classes', () => {
    const result = render(() => (
      <PTag class="consumer-tag" size="medium" tone="danger">
        오류
      </PTag>
    ))
    const tag = result.getByText('오류')

    expect(tag.classList).toContain('consumer-tag')
    expect(tag.classList).toContain('text-xs')
    expect(tag.classList).toContain('text-danger')
  })
})
