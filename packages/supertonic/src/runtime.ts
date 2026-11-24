import {SUPERTONIC_ORT_WASM_URL} from './model'

export type SupertonicBackend = 'wasm' | 'webgpu'
export type SupertonicRuntime = typeof import('onnxruntime-web/wasm')

const configureRuntime = (runtime: SupertonicRuntime, runtimePath: string) => {
  runtime.env.wasm.numThreads = 1
  runtime.env.wasm.wasmPaths = runtimePath
  return runtime
}

/** Loads the selected provider; omitted runtimePath uses the pinned CDN, while packaged apps may supply local files. */
export const loadSupertonicRuntime = async (
  backend: SupertonicBackend,
  runtimePath = SUPERTONIC_ORT_WASM_URL,
): Promise<SupertonicRuntime> => {
  switch (backend) {
    case 'wasm':
      return configureRuntime(await import('onnxruntime-web/wasm'), runtimePath)
    case 'webgpu':
      return configureRuntime(await import('onnxruntime-web/webgpu'), runtimePath)
  }
}
