/** FileReader로 Blob을 읽을 때 사용할 오류 메시지. Blob.arrayBuffer의 오류에는 적용하지 않는다. */
export interface BlobReadMessages {
  /** FileReader 읽기 실패 시 새 Error에 사용할 메시지. 원래 reader.error는 cause로 보존한다. */
  readonly readFailed: string
  /** FileReader 읽기 결과가 ArrayBuffer가 아닐 때 사용할 오류 메시지. */
  readonly invalidResult: string
}
