/** @vitest-environment node */
import {beforeEach, expect, test, vi} from 'vitest'
import {save} from '@tauri-apps/plugin-dialog'
import {writeFile} from '@tauri-apps/plugin-fs'
import {writeDocumentFile} from '../write-document-file'
vi.mock('@tauri-apps/plugin-dialog', () => ({save: vi.fn()}))
vi.mock('@tauri-apps/plugin-fs', () => ({writeFile: vi.fn()}))
beforeEach(() => vi.clearAllMocks())

test('should write the complete bytes only to the selected native destination', async () => {
  vi.mocked(save).mockResolvedValue('/chosen/model.poffo')
  expect(await writeDocumentFile({content: new Blob(['model']), name: 'model.poffo'})).toBe(true)
  expect(writeFile).toHaveBeenCalledWith('/chosen/model.poffo', new TextEncoder().encode('model'))
})
test('should leave files alone when the dialog is cancelled', async () => {
  vi.mocked(save).mockResolvedValue(null)
  expect(await writeDocumentFile({content: new Blob(['model']), name: 'model.poffo'})).toBe(false)
  expect(writeFile).not.toHaveBeenCalled()
})
