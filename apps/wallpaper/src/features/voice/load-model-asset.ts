import manifest from '../../../voice-model.json'

/** Reads packaged speech assets without downloading models or duplicating them in browser storage. */
export const loadModelAsset = async (url: string): Promise<ArrayBuffer> => {
  const file = manifest.files.find((entry) => entry.url === url || entry.aliases.includes(url))
  if (file === undefined) {
    throw new Error('앱에 포함되지 않은 음성 파일이에요.')
  }
  const path = new URL(`/voice-assets/${file.path}`, globalThis.location.href).href
  const response = await fetch(path, {cache: 'no-store'})
  if (!response.ok) {
    throw new Error(`앱의 음성 파일을 읽지 못했어요. (${response.status})`)
  }
  return response.arrayBuffer()
}
