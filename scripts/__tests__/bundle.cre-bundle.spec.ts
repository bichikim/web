/**
 * @jest-environment node
 */

import {creBundle, RollupOptions} from '../bundle'
import path from 'path'
import fs from 'fs'
describe('bundle/creBundle', () => {
  const filePath = path.resolve(__dirname, '../', '__tests__', '__dist__.js')
  const options: RollupOptions = {
    cwd: path.resolve(__dirname, '../'),
    dist: '__tests__',
    entry: 'test-file.ts',
    name: 'tests',
    output: [{
      file: '__dist__.js',
      name: 'foo',
    }],
    src: '__tests__',
  }

  it('should bundle a ts file', async () => {
    await creBundle({
      ...options,
    })()

    expect(fs.existsSync(filePath)).toBe(true)

    fs.unlinkSync(filePath)
  })

  it('should not bundle without output', async () => {
    await creBundle({
      ...options,
      output: undefined,
    })()

    expect(fs.existsSync(filePath)).toBe(false)
  })
})
