/* eslint-disable eslint-js/camelcase -- ONNX and tokenizer input names are external contracts. */
import {Tensor} from 'onnxruntime-web/wasm'
import {buildSequence} from './sequence'
import type {JsonValue, ModelConfig, Question, SpecialTokens} from './types'

export interface BatchOptions {
  readonly encode: (text: string) => number[]
  readonly special: SpecialTokens
  readonly config: ModelConfig
  readonly state: JsonValue
  readonly questions: readonly Question[]
}

export const createBatch = (options: BatchOptions) => {
  if (options.questions.length === 0) {
    throw new TypeError('At least one question is required.')
  }
  const sequences = options.questions.map((question) => buildSequence({...options, question}))
  const length = Math.max(...sequences.map((sequence) => sequence.ids.length))
  const columns = Math.max(...sequences.map((sequence) => sequence.markers.length))
  const count = sequences.length
  const input = new BigInt64Array(count * length).fill(BigInt(options.special.pad))
  const attention = new BigInt64Array(count * length)
  const positions = new BigInt64Array(count * columns)
  const mask = new Uint8Array(count * columns)
  const types = new BigInt64Array(count)
  sequences.forEach((sequence, row) => {
    sequence.ids.forEach((token, column) => {
      input[row * length + column] = BigInt(token)
      attention[row * length + column] = 1n
    })
    sequence.markers.forEach((position, column) => {
      positions[row * columns + column] = BigInt(position)
      mask[row * columns + column] = 1
    })
    types[row] = BigInt({choice: 0, noul: 2, score: 1}[options.questions[row].type])
  })
  return {
    columns,
    count,
    feeds: {
      attention_mask: new Tensor('int64', attention, [count, length]),
      input_ids: new Tensor('int64', input, [count, length]),
      marker_mask: new Tensor('bool', mask, [count, columns]),
      marker_pos: new Tensor('int64', positions, [count, columns]),
      qtype: new Tensor('int64', types, [count]),
    },
    sequences,
  }
}
