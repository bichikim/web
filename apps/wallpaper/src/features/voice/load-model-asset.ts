import manifest from '../../../voice-model.json'

/** Reads weights from the verified desktop cache and presets from the local frontend. */
export const loadModelAsset = async (url: string, modelPath?: string): Promise<ArrayBuffer> => {
  const file = manifest.files.find((entry) => entry.url === url || entry.aliases.includes(url))
  if (file === undefined) {
    throw new Error('앱에 포함되지 않은 음성 파일이에요.')
  }
  const local = new URL('/voice-assets/', globalThis.location.href)
  const path = new URL(file.path, file.path.endsWith('.onnx') ? (modelPath ?? local) : local).href
  const response = await fetch(path, {cache: 'no-store'})
  if (!response.ok) {
    throw new Error(`앱의 음성 파일을 읽지 못했어요. (${response.status})`)
  }
  return response.arrayBuffer()
}
