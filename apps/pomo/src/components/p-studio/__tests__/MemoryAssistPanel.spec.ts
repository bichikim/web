import {expect, it, vi} from 'vitest'
import {PMemoryAssist} from '../../PMemoryAssist'
import {MemoryAssistPanel} from '../MemoryAssistPanel'
vi.mock('../../PMemoryAssist', () => ({PMemoryAssist: vi.fn()}))
it('should expose the interactive shell without a client loading placeholder', () => {
  expect(MemoryAssistPanel).toBe(PMemoryAssist)
})
