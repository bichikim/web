import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../../../create-empty-document'
import initialize from '../kernel.wasm?init'
import {loadWasmTransform} from '../load-transform'

vi.mock('../kernel.wasm?init', () => ({default: vi.fn()}))
const module = new WebAssembly.Module(readFileSync(resolve(import.meta.dirname, '../kernel.wasm')))
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

test('should initialize distinct instance memory for each document owner', async () => {
  vi.mocked(initialize).mockImplementation(async () => new WebAssembly.Instance(module))
  const first = await loadWasmTransform(createEmptyDocument())
  const second = await loadWasmTransform(createEmptyDocument())
  expect(first).toBeTypeOf('function')
  expect(second).toBeTypeOf('function')
  expect(second).not.toBe(first)
  expect(initialize).toHaveBeenCalledTimes(2)
})

test('should retain JavaScript without compiling when WebAssembly is unavailable', async () => {
  vi.stubGlobal('WebAssembly', undefined)
  await expect(loadWasmTransform(createEmptyDocument())).resolves.toBeUndefined()
  expect(initialize).not.toHaveBeenCalled()
})

test.each([new WebAssembly.CompileError('Feature disabled'), new TypeError('Network unavailable')])(
  'should retain JavaScript when the numeric module cannot load: %s',
  async (cause) => {
    vi.mocked(initialize).mockRejectedValue(cause)
    await expect(loadWasmTransform(createEmptyDocument())).resolves.toBeUndefined()
  },
)

test('should propagate unexpected initialization failures to Worker error handling', async () => {
  const cause = new Error('Unexpected initialization failure')
  vi.mocked(initialize).mockRejectedValue(cause)
  await expect(loadWasmTransform(createEmptyDocument())).rejects.toBe(cause)
})
