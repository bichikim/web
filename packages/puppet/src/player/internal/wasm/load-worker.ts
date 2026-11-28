import {createWasmWorker, type WasmWorker} from './create-worker'
const MINIMUM_PARTS = 128
const MINIMUM_CORES = 4
let prepared: Promise<import('./parallel/index').InitOutput> | undefined
const parallelExports = () => {
  prepared ??= (async () => {
    const parallel = await import('./parallel/index')
    const exports = await parallel.default()
    await parallel.initThreadPool(2)
    return exports
  })()
  return prepared
}
/** Loads an owned playback heap; larger isolated scenes use two shared-memory CPU threads. */
export const loadWasmWorker = async (partCount = 0): Promise<WasmWorker> => {
  if (
    partCount >= MINIMUM_PARTS &&
    globalThis.crossOriginIsolated &&
    typeof SharedArrayBuffer !== 'undefined' &&
    typeof Worker !== 'undefined' &&
    navigator.hardwareConcurrency >= MINIMUM_CORES
  ) {
    const exports = await parallelExports()
    return {...createWasmWorker({exports: {...exports}}), threads: exports.worker_thread_count()}
  }
  const {default: initialize} = await import('./runtime.wasm?init')
  return {...createWasmWorker(await initialize()), threads: 1}
}
