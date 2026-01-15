import {afterEach, describe, expect, it, vi} from 'vitest'
import {glob} from 'glob'
import {getFilesFromPath} from '../get-files-from-path'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

vi.mock('glob', async () => {
  const modules: any = await vi.importActual('glob')

  return {
    ...modules,
    glob: vi.fn(modules.glob),
  }
})

describe('getFilesFromPath', () => {
  afterEach(() => {
    vi.mocked(glob).mockRestore()
  })

  it('should return an empty array when the path has no files', async () => {
    const emptyPath = '/path/with/no/files'
    const mockFiles: string[] = []

    vi.mocked(glob).mockImplementationOnce(() => Promise.resolve(mockFiles))

    const result = await getFilesFromPath(emptyPath)

    expect(glob).toHaveBeenCalledWith('**/*', {
      cwd: emptyPath,
      nodir: true,
    })
    expect(result).toEqual([])
  })

  it('should return all files when pattern is "**/*"', async () => {
    const dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))
    const testPath = path.join(dirname, 'tmp/test')
    const testFiles = ['file1.txt', 'file2.js', 'subdir/file3.css']

    // Create temporary test directory and files
    await fs.promises.mkdir(testPath, {recursive: true})
    await fs.promises.mkdir(path.join(testPath, 'subdir'), {recursive: true})

    for (const file of testFiles) {
      fs.writeFileSync(path.join(testPath, file), '')
    }

    try {
      const result = await getFilesFromPath(testPath, '**/*')

      expect(result.sort()).toEqual(testFiles.sort())
    } finally {
      // Clean up: remove test directory and files
      fs.rmSync(testPath, {force: true, recursive: true})
    }
  })
})
