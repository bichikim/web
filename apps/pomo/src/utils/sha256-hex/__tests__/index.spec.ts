/** @vitest-environment node */
import {expect, it} from 'vitest'
import {sha256Hex} from '..'

it('should return the standard lowercase digest and respect a view byte range', async () => {
  const bytes = new TextEncoder().encode('_abc_')
  expect(await sha256Hex(bytes.subarray(1, 4))).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
  expect(await sha256Hex(new ArrayBuffer(0))).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
})
