/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {PMusicPlayerContent} from '../PMusicPlayerContent'
import {PMusicPlayerPanel} from '../PMusicPlayerPanel'

const {mockMusicPlayerContent} = vi.hoisted(() => ({
  mockMusicPlayerContent: vi.fn(),
}))

vi.mock('../PMusicPlayerContent', () => ({
  PMusicPlayerContent: mockMusicPlayerContent,
}))

it('should expose the music player content for server rendering', () => {
  expect(PMusicPlayerPanel).toBe(PMusicPlayerContent)
})
