/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {open} from '@tauri-apps/plugin-dialog'
import {readFile} from '@tauri-apps/plugin-fs'
import {basename} from '@tauri-apps/api/path'
import {useFileDialog} from '../use-file-dialog'

vi.mock('@tauri-apps/plugin-dialog', () => ({open: vi.fn()}))
vi.mock('@tauri-apps/plugin-fs', () => ({readFile: vi.fn()}))
vi.mock('@tauri-apps/api/path', () => ({basename: vi.fn()}))

const options = {extensions: ['json'], title: '불러오기'}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(open).mockResolvedValue('/picked/model.json')
  vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]))
  vi.mocked(basename).mockResolvedValue('model.json')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => vi.restoreAllMocks())

test('should return the selected file bytes with its native filename', async () => {
  const {result} = renderHook(useFileDialog)
  const file = await result.openFile(options)
  expect(file).toBeInstanceOf(File)
  expect(file?.name).toBe('model.json')
  expect(file?.size).toBe(3)
  expect(readFile).toHaveBeenCalledExactlyOnceWith('/picked/model.json')
  expect(result.error()).toBeNull()
})

test('should treat cancellation as absence and skip reading a file', async () => {
  vi.mocked(open).mockResolvedValue(null)
  const {result} = renderHook(useFileDialog)
  expect(await result.openFile(options)).toBeUndefined()
  expect(readFile).not.toHaveBeenCalled()
  expect(result.error()).toBeNull()
})

test('should expose a dialog error and allow a subsequent retry', async () => {
  vi.mocked(open).mockRejectedValueOnce(new Error('dialog unavailable'))
  const {result} = renderHook(useFileDialog)
  expect(await result.openFile(options)).toBeUndefined()
  expect(result.error()).toBe('파일을 열지 못했습니다.')
  expect(await result.openFile(options)).toBeInstanceOf(File)
  expect(result.error()).toBeNull()
})

test('should expose a read error that can be dismissed', async () => {
  vi.mocked(readFile).mockRejectedValue(new Error('read permission denied'))
  const {result} = renderHook(useFileDialog)
  expect(await result.openFile(options)).toBeUndefined()
  expect(result.error()).toBe('파일을 열지 못했습니다.')
  result.dismissError()
  expect(result.error()).toBeNull()
})

test('should prevent duplicate dialogs while a selection is pending', async () => {
  const selection = Promise.withResolvers<string | null>()
  vi.mocked(open).mockReturnValue(selection.promise)
  const {result} = renderHook(useFileDialog)
  const first = result.openFile(options)
  expect(await result.openFile(options)).toBeUndefined()
  expect(open).toHaveBeenCalledOnce()
  selection.resolve('/picked/model.json')
  expect(await first).toBeInstanceOf(File)
})

test('should skip file reads and further dialogs after disposal', async () => {
  const selection = Promise.withResolvers<string | null>()
  vi.mocked(open).mockReturnValue(selection.promise)
  const mounted = renderHook(useFileDialog)
  const pending = mounted.result.openFile(options)
  mounted.cleanup()
  selection.resolve('/picked/model.json')
  expect(await pending).toBeUndefined()
  expect(readFile).not.toHaveBeenCalled()
  expect(await mounted.result.openFile(options)).toBeUndefined()
  expect(open).toHaveBeenCalledOnce()
})

test('should suppress late read failures after disposal', async () => {
  const read = Promise.withResolvers<Uint8Array<ArrayBuffer>>()
  vi.mocked(readFile).mockReturnValue(read.promise)
  const mounted = renderHook(useFileDialog)
  const pending = mounted.result.openFile(options)
  await Promise.resolve()
  expect(readFile).toHaveBeenCalledOnce()
  mounted.cleanup()
  read.reject(new Error('file disappeared'))
  expect(await pending).toBeUndefined()
  expect(mounted.result.error()).toBeNull()
  expect(console.error).not.toHaveBeenCalled()
})

test('should discard a completed read when its owner has been disposed', async () => {
  const read = Promise.withResolvers<Uint8Array<ArrayBuffer>>()
  vi.mocked(readFile).mockReturnValue(read.promise)
  const mounted = renderHook(useFileDialog)
  const pending = mounted.result.openFile(options)
  await Promise.resolve()
  expect(readFile).toHaveBeenCalledOnce()
  mounted.cleanup()
  read.resolve(new Uint8Array([1, 2, 3]))
  expect(await pending).toBeUndefined()
  expect(mounted.result.error()).toBeNull()
})
