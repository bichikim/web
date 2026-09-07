const RUNTIME_SOURCE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/'
const RUNTIME_STORAGE = 'https://storage.pomofi.io/runtime/onnxruntime-web/1.27.0/'

export const getTextRuntimeAssetUrl = (url: string | URL | undefined): string | undefined => {
  if (url === undefined) {
    return undefined
  }
  return String(url).replace(RUNTIME_SOURCE, RUNTIME_STORAGE)
}
