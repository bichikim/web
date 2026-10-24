/** 여러 Float32Array를 원본 변경 없이 하나의 새 배열로 이어 붙인다. 빈 목록에는 빈 배열을 반환한다. */
export const concatFloat32 = (chunks: ReadonlyArray<Float32Array>): Float32Array<ArrayBuffer> => {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const samples = new Float32Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    samples.set(chunk, offset)
    offset += chunk.length
  }

  return samples
}
