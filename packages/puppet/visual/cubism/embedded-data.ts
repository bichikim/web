import {gunzipSync, strFromU8, unzipSync} from 'fflate'

interface EmbeddedPayload {
  readonly archive: string
  readonly document: string
  readonly notices: string
}

const decode = (value: string) =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0))

/** HTML에 포함된 데이터. 처음 펼친 결과를 이후 호출에서 재사용한다. */
export const embedded = (() => {
  let cached:
    | {
        archive: Uint8Array
        document: string
        files: Record<string, Uint8Array>
        notices: string
      }
    | undefined
  return () => {
    if (cached !== undefined) {
      return cached
    }
    const element = document.getElementById('comparison-data')
    if (element?.textContent === null || element === null) {
      throw new Error('HTML에 포함된 모델 데이터가 없습니다.')
    }
    const payload = JSON.parse(element.textContent) as EmbeddedPayload
    const archive = decode(payload.archive)
    cached = {
      archive,
      document: strFromU8(gunzipSync(decode(payload.document))),
      files: unzipSync(archive),
      notices: payload.notices,
    }
    return cached
  }
})()

/** 포함된 원본 파일을 읽는다. 누락된 파일은 외부에서 찾지 않는다. */
export const embeddedFile = (path: string): Uint8Array => {
  const file = embedded().files[path]
  if (file === undefined) {
    throw new Error(`HTML에 포함되지 않은 파일: ${path}`)
  }
  return file
}
