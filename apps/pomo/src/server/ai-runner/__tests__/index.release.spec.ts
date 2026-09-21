/** @vitest-environment node */
import {expect, it} from 'vitest'
import {startRunner} from '../index'
it('should reject unreleased startup before validating configuration or creating resources', async () => {
  await expect(startRunner({})).rejects.toThrow(
    'Server AI is unreleased; runner startup is disabled',
  )
})
