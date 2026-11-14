/** @vitest-environment node */
import {afterEach, expect, test, vi} from 'vitest'
import {digest, digestHex} from '../digest'

afterEach(() => vi.restoreAllMocks())

test('should hash the exact stored bytes using SHA-256', async () => {
  expect(digestHex(await digest(new Blob(['abc'])))).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
})

test('should cancel a pending Blob read and avoid starting its checksum', async () => {
  let finish!: (value: ArrayBuffer) => void
  const reading = new Promise<ArrayBuffer>((resolve) => {
    finish = resolve
  })
  const source = new Blob([])
  vi.spyOn(source, 'arrayBuffer').mockReturnValue(reading)
  const hash = vi.spyOn(crypto.subtle, 'digest')
  const controller = new AbortController()
  const pending = digest(source, controller.signal)
  controller.abort(new Error('stop reading'))
  await expect(pending).rejects.toBe(controller.signal.reason)
  finish(new ArrayBuffer(0))
  await Promise.resolve()
  expect(hash).not.toHaveBeenCalled()
})

test('should cancel a pending checksum and consume its later failure', async () => {
  let fail!: (reason: Error) => void
  const hashing = new Promise<ArrayBuffer>((_, reject) => {
    fail = reject
  })
  let start!: () => void
  const started = new Promise<void>((resolve) => {
    start = resolve
  })
  vi.spyOn(crypto.subtle, 'digest').mockImplementation(() => {
    start()
    return hashing
  })
  const controller = new AbortController()
  const pending = digest(new Blob(['abc']), controller.signal)
  await started
  controller.abort(new Error('stop hashing'))
  await expect(pending).rejects.toBe(controller.signal.reason)
  fail(new Error('late checksum failure'))
  await expect(pending).rejects.toBe(controller.signal.reason)
})
