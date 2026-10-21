/**
 * 바이트 뷰를 순서대로 새 버퍼에 복사하며, 미리 구한 출력 길이를 지정할 수 있다.
 * 남는 공간은 0으로 유지하며, 공간이 부족하면 내장 RangeError를 던진다.
 */
export const concatBytes = (
  chunks: ReadonlyArray<Uint8Array>,
  totalBytes = chunks.reduce((total, chunk) => total + chunk.byteLength, 0),
): Uint8Array<ArrayBuffer> => {
  const result = new Uint8Array(totalBytes)
  let offset = 0

  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }

  return result
}
