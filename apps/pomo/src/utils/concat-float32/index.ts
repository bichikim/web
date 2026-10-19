export interface Float32Source {
  readonly chunks: ReadonlyArray<Float32Array>
}

/** 비어 있지 않은 뷰 모음을 새 버퍼에 복사하고 0 이상의 정수 길이 간격을 둔다. 청크는 샘플 크기 계산, 간격 크기 계산, 복사 순으로 읽는다. */
export const concatFloat32 = (
  source: Float32Source,
  gapLength: number,
): Float32Array<ArrayBuffer> => {
  const totalLength =
    source.chunks.reduce((total, chunk) => total + chunk.length, 0) +
    (source.chunks.length - 1) * gapLength
  const samples = new Float32Array(totalLength)
  let offset = 0

  for (const chunk of source.chunks) {
    samples.set(chunk, offset)
    offset += chunk.length + gapLength
  }

  return samples
}
