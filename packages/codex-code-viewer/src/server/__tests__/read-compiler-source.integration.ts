import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import typescript from '@typescript/typescript6'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readCompilerSource} from '../read-compiler-source'

const original = 'export const 인사 = "hello 👋"\n'
const littleEndian = Buffer.from(original, 'utf16le')
const encodings = [
  {bytes: Buffer.from(original), name: 'utf8'},
  {bytes: Buffer.concat([Buffer.from('efbbbf', 'hex'), Buffer.from(original)]), name: 'utf8-bom'},
  {bytes: Buffer.concat([Buffer.from('fffe', 'hex'), littleEndian]), name: 'utf16le'},
  {
    bytes: Buffer.concat([Buffer.from('feff', 'hex'), Buffer.from(littleEndian).swap16()]),
    name: 'utf16be',
  },
  {bytes: Buffer.from(`\uFFFD\uFFFD${original}`), name: 'replacement-prefix'},
  {bytes: Buffer.from([0x61, 0xff, 0x62, 0xc0, 0x80]), name: 'invalid-utf8'},
  {bytes: Buffer.alloc(0), name: 'empty'},
]
describe('readCompilerSource', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'compiler-source-'))
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))
  it.each(encodings)('should preserve compiler decoding for $name', ({bytes}) => {
    const file = join(root, 'source.ts')
    writeFileSync(file, bytes)
    expect(readCompilerSource(file)).toBe(typescript.sys.readFile(file))
  })
  it('should return no source for missing files and directories', () => {
    expect(readCompilerSource(join(root, 'missing.ts'))).toBeUndefined()
    const directory = join(root, 'directory.ts')
    mkdirSync(directory)
    expect(readCompilerSource(directory)).toBeUndefined()
  })
})
