import {gzipSync} from 'node:zlib'
import {describe, expect, it} from 'vitest'
import {extractTypescriptFiles} from '../extract-typescript-files'

const archive = (name: string, text: string, type = '0') => {
  const header = Buffer.alloc(512)
  header.write(name)
  header.write(text.length.toString(8).padStart(11, '0'), 124)
  header.write(type, 156)
  return Buffer.concat([header, Buffer.from(text), Buffer.alloc((512 - (text.length % 512)) % 512)])
}
describe('extractTypescriptFiles', () => {
  it('should retain the binary and SDK declarations and exclude other archive paths', () => {
    const bytes = gzipSync(
      Buffer.concat([
        archive('package/lib/tsc', 'binary'),
        archive('package/lib/lib.es5.d.ts', 'declare'),
        archive('package/lib/../../outside', 'outside'),
        archive('package/lib/lib.other.d.ts', 'link', '2'),
      ]),
    )
    expect(extractTypescriptFiles(bytes)).toEqual(
      new Map([
        ['tsc', Buffer.from('binary')],
        ['lib.es5.d.ts', Buffer.from('declare')],
      ]),
    )
  })
  it('should reject a truncated archive entry', () => {
    const entry = archive('package/lib/tsc', 'binary')
    expect(() => extractTypescriptFiles(gzipSync(entry.subarray(0, 515)))).toThrow('Truncated')
  })
})
