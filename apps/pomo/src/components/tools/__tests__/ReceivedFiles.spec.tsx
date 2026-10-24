/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {receivedFiles} from 'src/features/file-transfer/session'
import {ReceivedFiles} from '../ReceivedFiles'

vi.mock('src/features/file-transfer/session', () => ({
  fileTransfer: {isActive: false, setAutoAccept: vi.fn(), state: {autoAccept: false}},
  receivedFiles: {
    clearRemoved: vi.fn(),
    remove: vi.fn(),
    removeAll: vi.fn(),
    retainedBytes: () => 3,
    save: vi.fn(),
    saveAll: vi.fn(),
    state: {error: false, files: [], saving: false},
  },
}))

beforeEach(() => {
  receivedFiles.state.files = ['first.txt', 'second.txt', 'third.txt'].map((name, index) => ({
    id: name,
    mimeType: 'text/plain',
    name,
    removed: null,
    saved: false,
    size: 1,
    url: `blob:${index}`,
  }))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ReceivedFiles', () => {
  it('should show every card and its actions in receive order without selecting a card', () => {
    render(() => <ReceivedFiles />)
    const list = screen.getByRole('list', {name: m.transfer_collection()})
    expect(
      Array.from(list.children).map((item) =>
        item.querySelector('article')?.getAttribute('aria-label'),
      ),
    ).toEqual(['first.txt', 'second.txt', 'third.txt'])
    expect(screen.getAllByRole('button', {name: m.transfer_save()})).toHaveLength(3)
    expect(screen.getAllByRole('button', {name: m.transfer_remove()})).toHaveLength(3)
  })
  it('should allow clearing the collection when only deleted cards remain', () => {
    receivedFiles.state.files = receivedFiles.state.files.map((file) => ({
      ...file,
      removed: 'capacity',
      url: null,
    }))
    render(() => <ReceivedFiles />)
    const removeAll = screen.getByRole('button', {name: m.transfer_remove_all()})
    expect(removeAll).toBeEnabled()
    fireEvent.click(removeAll)
    expect(receivedFiles.removeAll).toHaveBeenCalled()
  })
})
