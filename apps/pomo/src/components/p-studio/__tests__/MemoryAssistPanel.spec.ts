/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {PMemoryAssist} from '../../p-memory-assist/PMemoryAssist'
import {MemoryAssistPanel} from '../MemoryAssistPanel'
vi.mock('../../p-memory-assist/PMemoryAssist', () => ({PMemoryAssist: vi.fn()}))
it('should expose the interactive shell without a client loading placeholder', () => {
  expect(MemoryAssistPanel).toBe(PMemoryAssist)
})
