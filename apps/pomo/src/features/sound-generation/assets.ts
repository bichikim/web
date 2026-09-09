const BASE_URL =
  'https://huggingface.co/stabilityai/stable-audio-3-optimized/resolve/da6edc54ddba10bfd79a077102ded687f80e882b'
const PERCENT = 100
const MEGABYTE = 1_000_000

export const ASSET_LABELS: Readonly<Record<string, string>> = {
  'onnx/sa3-sm-sfx/dit_fp16.onnx': '환경음 생성 모델',
  'onnx/same-s/dec_bf16.onnx': '오디오 디코더',
  'onnx/t5gemma/encoder.onnx': '텍스트 이해 모델',
  'tensorRT/sm_90/t5gemma/tokenizer.json': '프롬프트 분석 파일',
}

export type SoundProgress = (message: string) => void

/** Loads pinned model bytes, using persistent cache when available. */
export async function loadAsset(path: string, progress: SoundProgress): Promise<Uint8Array> {
  const url = `${BASE_URL}/${path}`
  let cache: Cache | undefined
  try {
    cache = await caches.open('pomo-stable-audio-3-v1')
    const cached = await cache.match(url)
    if (cached !== undefined) {
      return new Uint8Array(await cached.arrayBuffer())
    }
  } catch {
    cache = undefined
    progress('모델 저장소를 사용할 수 없어 이번에는 모델을 임시로 사용합니다.')
  }
  progress(`${ASSET_LABELS[path]} 다운로드 중…`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`모델 다운로드 실패 (${response.status}): ${path}`)
  }
  const total = Number(response.headers.get('content-length'))
  let received = 0
  let percentage = -1
  const body = response.body?.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength
        const next =
          total > 0 ? Math.floor((received / total) * PERCENT) : Math.floor(received / MEGABYTE)
        if (next !== percentage) {
          percentage = next
          progress(`${ASSET_LABELS[path]} 다운로드 중 · ${next}${total > 0 ? '%' : 'MB'}`)
        }
        controller.enqueue(chunk)
      },
    }),
  )
  const buffer = await new Response(body).arrayBuffer()
  try {
    await cache?.put(url, new Response(buffer))
  } catch {
    progress('저장 공간이 부족해 이번에는 모델을 임시로 사용합니다.')
  }
  return new Uint8Array(buffer)
}
