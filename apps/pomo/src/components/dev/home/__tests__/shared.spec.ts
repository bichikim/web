import {expect, it} from 'vitest'

import {CARD_CLASSES} from '../shared'

it('should expose the shared interactive home card classes', () => {
  expect(CARD_CLASSES).toContain('group grid')
  expect(CARD_CLASSES).toContain('hover:-translate-y-1')
})
