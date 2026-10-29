import {expect, test} from 'vitest'
import {parseIndex} from '../parse-index'

const hash = '0'.repeat(64)
const asset = {
  codec: 0,
  decodedLength: 4,
  encodedLength: 4,
  prefix: 'data:image/png;base64,',
  sha256: hash,
}
const index = (entry: unknown = asset) => JSON.stringify({assets: [entry], metadataSha256: hash})

test('should retain validated asset order and exact data URL prefixes', () => {
  const entry = {...asset, prefix: 'DATA:image/png;name=original;BASE64,'}
  expect(parseIndex(index(entry), 1)).toEqual({assets: [entry], metadataSha256: hash})
})

test.each([
  {codec: 2},
  {decodedLength: -1},
  {decodedLength: 0.5},
  {encodedLength: 4_294_967_296},
  {encodedLength: 3},
  {prefix: 'https://example.com/image.png'},
  {prefix: 'data:image/png,AA=='},
  {sha256: 'bad'},
])('should reject an invalid asset entry %j', (change) => {
  expect(() => parseIndex(index({...asset, ...change}), 1)).toThrow(SyntaxError)
})

test('should reject an asset count that differs from the header', () => {
  expect(() => parseIndex(index(), 0)).toThrow(SyntaxError)
})

test.each(['null', '[]', '{}', '{"assets":[],"metadataSha256":"bad"}'])(
  'should reject a malformed index %s',
  (source) => {
    expect(() => parseIndex(source, 0)).toThrow(SyntaxError)
  },
)
