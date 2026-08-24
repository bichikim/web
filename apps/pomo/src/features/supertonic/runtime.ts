import {SUPERTONIC_ORT_WASM_URL} from './model'

export type SupertonicBackend = 'wasm' | 'webgpu'
export type SupertonicRuntime = typeof import('onnxruntime-web/wasm')

const configureRuntime = (runtime: SupertonicRuntime) => {
  runtime.env.wasm.numThreads = 1
  runtime.env.wasm.wasmPaths = SUPERTONIC_ORT_WASM_URL
  return runtime
}

/** Loads only the ONNX execution providers required by the selected backend. */
export const loadSupertonicRuntime = async (
  backend: SupertonicBackend,
): Promise<SupertonicRuntime> => {
  switch (backend) {
    case 'wasm':
      return configureRuntime(await import('onnxruntime-web/wasm'))
    case 'webgpu':
      return configureRuntime(await import('onnxruntime-web/webgpu'))
  }
}
