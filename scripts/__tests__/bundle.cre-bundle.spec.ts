/**
 * @jest-environment node
 */

import {creBundle, RollupOptions} from '../bundle'
import path from 'path'
import fs from 'fs'
describe('bundle/creBundle', function test() {
  const filePath = path.resolve(__dirname, '../', '__tests__', '__dist__.js')
  const options: RollupOptions = {
    cwd: path.resolve(__dirname, '../'),
    src: '__tests__',
    entry: 'test-file.ts',
    dist: '__tests__',
    name: 'tests',
    output: [{
      name: 'foo',
      file: '__dist__.js',
    }],
  }

  it('should bundle a ts file', async function test() {
    await creBundle({
      ...options,
    })()

    expect(fs.existsSync(filePath)).toBe(true)

    fs.unlinkSync(filePath)
  })

  it('should not bundle without output', async function test() {
    await creBundle({
      ...options,
      output: undefined,
    })()

    expect(fs.existsSync(filePath)).toBe(false)
  })
})
