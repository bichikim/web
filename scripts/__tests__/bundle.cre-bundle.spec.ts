import {creBundle} from '../bundle'
import path from 'path'
import fs from 'fs'
describe('bundle/creBundle', function test() {
  it('should ', async function test() {
    const filePath = path.resolve(__dirname, '../', '__lib__', 'index.js')

    await creBundle({
      cwd: path.resolve(__dirname, '../'),
      src: '__tests__',
      entry: 'test-file.ts',
      dist: '__lib__',
      name: 'tests',
      output: [{
        name: 'foo',
      }],
    })()

    const result = fs.existsSync(filePath)

    expect(result).toBe(true)

    fs.unlinkSync(filePath)
  })
})
