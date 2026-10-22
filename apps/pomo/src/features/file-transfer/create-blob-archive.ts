import {Zip, ZipPassThrough} from 'fflate'

export interface NamedBlob {
  readonly blob: Blob
  readonly name: string
}

// 사용자가 승인한 부수 효과 예외는 이 ZIP 스트리밍 어댑터에만 적용한다.
// archive.add(entry)는 전달받은 아카이브를, entry.push는 새 항목을 변경한다.
// fflate는 push 전에 add를 호출해야 하며, 데이터를 채운 항목을 나중에 추가해도 기존 데이터를 재전송하지 않는다.
// 따라서 입력을 완성된 항목으로 변환하는 순수 함수로 이 스트리밍 흐름을 대체할 수 없다.
// 청크를 순차적으로 읽어 모든 원본 파일을 버퍼링하지 않고 하나의 Blob 리더만 활성화한다.
// 버퍼링하는 ZIP API는 입력 메모리를 추가로 사용하고 항목 순서를 명시적으로 보장해야 한다.
// 다른 순수 ZIP 구현의 가능성까지 배제하는 것은 아니다.
const appendArchive = async (archive: Zip, blob: Blob, name: string): Promise<void> => {
  const entry = new ZipPassThrough(name)
  archive.add(entry)
  const reader = blob.stream().getReader()
  try {
    let chunk = await reader.read()
    while (!chunk.done) {
      entry.push(chunk.value)
      // oxlint-disable-next-line no-await-in-loop -- 입력 메모리 사용량을 제한하도록 청크를 한 번에 하나씩 읽는다.
      chunk = await reader.read()
    }
    entry.push(new Uint8Array(), true)
  } finally {
    reader.releaseLock()
  }
}

/** Blob을 입력 순서대로 압축하고 이름이 겹치면 증가하는 정수를 앞에 붙인다. 그 외의 이름은 그대로 유지한다. */
export const createBlobArchive = async (files: readonly NamedBlob[]): Promise<Blob> => {
  const chunks: BlobPart[] = []
  const archive = new Zip((error, data) => {
    if (error !== null) {
      throw error
    }
    chunks.push(new Uint8Array(data))
  })
  const names = new Set<string>()
  for (const file of files) {
    let {name} = file
    let suffix = 1
    while (names.has(name)) {
      name = `${suffix}-${file.name}`
      suffix += 1
    }
    names.add(name)
    // oxlint-disable-next-line no-await-in-loop -- 순차 스트리밍으로 하나의 리더만 활성화하고 입력 메모리 사용량을 제한한다.
    await appendArchive(archive, file.blob, name)
  }
  archive.end()
  return new Blob(chunks, {type: 'application/zip'})
}
