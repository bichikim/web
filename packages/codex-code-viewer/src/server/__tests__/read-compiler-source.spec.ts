import {readFileSync} from 'node:fs'
import typescript from '@typescript/typescript6'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {readCompilerSource} from '../read-compiler-source'

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  const module = {...actual, readFileSync: vi.fn()}
  return {...module, default: module}
})
vi.mock('@typescript/typescript6', () => ({default: {sys: {readFile: vi.fn()}}}))

describe('readCompilerSource failure contracts', () => {
  beforeEach(() => {
    vi.mocked(readFileSync).mockReset().mockReturnValue('source')
    vi.mocked(typescript.sys.readFile).mockReset().mockReturnValue('legacy source')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })
  it('should avoid a second read for filesystem errors', () => {
    vi.mocked(readFileSync).mockImplementationOnce(() => {
      throw Object.assign(new Error('missing'), {errno: -2})
    })
    expect(readCompilerSource('missing.ts')).toBeUndefined()
    expect(typescript.sys.readFile).not.toHaveBeenCalled()
  })
  it('should delegate native decoding failures to the compiler reader', () => {
    vi.mocked(readFileSync).mockImplementationOnce(() => {
      throw new RangeError('native decoder cannot represent this source')
    })
    expect(readCompilerSource('source.ts')).toBe('legacy source')
    expect(typescript.sys.readFile).toHaveBeenCalledWith('source.ts')
  })
  it('should propagate compiler decoding failures instead of treating them as missing files', () => {
    const failure = new RangeError('compiler decoding failed')
    vi.mocked(readFileSync).mockReturnValue('\uFFFD\uFFFD')
    vi.mocked(typescript.sys.readFile).mockImplementationOnce(() => {
      throw failure
    })
    expect(() => readCompilerSource('source.ts')).toThrow(failure)
  })
})
