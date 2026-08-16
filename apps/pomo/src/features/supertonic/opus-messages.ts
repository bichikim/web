export interface OpusWorkerRequest {
  readonly sampleRate: number
  readonly samples: Float32Array
}

export type OpusWorkerResponse =
  | {readonly audio: Blob; readonly type: 'complete'}
  | {readonly detail: string; readonly type: 'error'}
