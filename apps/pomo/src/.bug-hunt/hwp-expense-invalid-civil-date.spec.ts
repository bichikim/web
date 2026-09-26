/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  parseExpenseAssistantResponse,
  parseExpenseText,
} from '../components/dev/hwp/expense'

describe('HWP expense parser civil date validation', () => {
  it('should reject impossible civil dates in plain-text input', () => {
    expect(parseExpenseText('2026-02-30\n우유 1,000원').ok).toBe(false)
  })

  it('should reject impossible civil dates in assistant JSON', () => {
    expect(
      parseExpenseAssistantResponse(
        '{"date":"2026-02-30","items":[{"name":"우유","unitPrice":1000,"quantity":1}]}',
      ).ok,
    ).toBe(false)
  })
})
