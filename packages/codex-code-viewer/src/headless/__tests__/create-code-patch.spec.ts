import {expect, it} from 'vitest'
import {createCodePatch} from '../create-code-patch'

it('should capture the changed source against its saved baseline', () => {
  const patch = createCodePatch({
    original: 'const value = 1\n',
    path: 'a.ts',
    source: 'const value = 2\n',
  })
  expect(patch).toContain('-const value = 1')
  expect(patch).toContain('+const value = 2')
  expect(patch).toContain('Last read or saved')
})
