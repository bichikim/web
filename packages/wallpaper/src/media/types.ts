/** Error messages for FileReader reads; native Blob.arrayBuffer failures are unchanged. */
export interface BlobReadMessages {
  /** Message for a wrapped read failure; the original reader.error remains its cause. */
  readonly readFailed: string
  /** Message when the FileReader result is not an ArrayBuffer. */
  readonly invalidResult: string
}
