import {expect, test, vi} from 'vitest'
import {createWasmWorker} from '../create-worker'
import {createEmptyDocument} from '../../../create-empty-document'
test('should decode shared-heap responses without retaining old bytes after a longer reply', () => {
  const decode = TextDecoder.prototype.decode
  // Browsers reject shared decode input; Node accepts it, so enforce the browser boundary here.
  const decoder = vi
    .spyOn(TextDecoder.prototype, 'decode')
    .mockImplementation(function decoder(this: TextDecoder, input, options) {
      if (ArrayBuffer.isView(input) && input.buffer instanceof SharedArrayBuffer) {
        throw new TypeError('Shared decode input is not supported')
      }
      return decode.call(this, input, options)
    })
  const memory = new WebAssembly.Memory({initial: 1, maximum: 2, shared: true})
  let content = {bytes: 8, id: 1, kind: 'initialized'} as unknown
  let length = 0
  const exports = {
    memory,
    worker_drop: () => {},
    worker_input: () => 0,
    worker_new: () => 1,
    worker_output: () => 8192,
    worker_output_length: () => length,
    worker_process: () => {
      const bytes = new TextEncoder().encode(JSON.stringify(content))
      length = bytes.length
      new Uint8Array(memory.buffer, 8192, length).set(bytes)
    },
  }
  const worker = createWasmWorker({exports})
  try {
    expect(
      worker.processPacked({
        audio: new Map(),
        document: createEmptyDocument(),
        id: 1,
        kind: 'initialize',
      }),
    ).toEqual(content)
    content = {id: 2, kind: 'error', message: 'long'.repeat(1000)}
    expect(worker.processPacked({id: 2, kind: 'audio', removed: [], sounds: new Map()})).toEqual(
      content,
    )
    content = {id: 3, kind: 'error', message: 'short'}
    expect(worker.processPacked({id: 3, kind: 'audio', removed: [], sounds: new Map()})).toEqual(
      content,
    )
  } finally {
    worker.destroy()
    decoder.mockRestore()
  }
})
