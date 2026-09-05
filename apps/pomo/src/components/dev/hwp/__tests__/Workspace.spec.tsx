/** @vitest-environment jsdom */

import {clientOnly} from '@solidjs/start'
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/start', () => ({
  clientOnly: vi.fn((load: () => Promise<unknown>) => load),
}))
vi.mock('src/components/dev/hwp/HwpDocumentWorkspace', () => ({default: vi.fn()}))

it('should configure a lazy client-only HWP workspace', async () => {
  const {HwpWorkspace} = await import('../Workspace')
  const [load, options] = vi.mocked(clientOnly).mock.calls[0] ?? []

  expect(HwpWorkspace).toBe(load)
  expect(options).toEqual({lazy: true})
  await load?.()
})

afterEach(() => {
  vi.clearAllMocks()
})
