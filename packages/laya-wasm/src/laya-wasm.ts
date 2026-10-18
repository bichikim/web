/* eslint-disable eslint-js/camelcase -- ONNX and tokenizer input names are external contracts. */
import {Tokenizer} from '@huggingface/tokenizers'
import {env, InferenceSession, Tensor} from 'onnxruntime-web/wasm'
import {decodeAnswer, questionTemperature} from './answers'
import {createBatch} from './batch'
import {validateCheckpoint} from './checkpoint'
import {parseManifest, readObject} from './manifest'
import {renderOptions} from './sequence'
import {yieldToBrowser} from './yield-to-browser'
import {resolveSpecialTokens} from './special-tokens'
import type {
  Checkpoint,
  DecisionResult,
  JsonValue,
  LoadOptions,
  Manifest,
  Question,
  SpecialTokens,
  TrainingExample,
  TrainingResult,
  TrainOptions,
} from './types'

const fetchFile = async (url: URL, signal?: AbortSignal): Promise<Response> => {
  const response = await fetch(url, {signal})
  if (!response.ok) {
    throw new Error(`Failed to load ${url.pathname}: HTTP ${response.status}`)
  }
  return response
}
const parameterCount = (manifest: Manifest): number =>
  manifest.parameters.reduce(
    (sum, parameter) =>
      sum + parameter.dimensions.reduce((product, dimension) => product * dimension, 1),
    0,
  )
const dispose = (values: Readonly<Record<string, Tensor>>): void => {
  Object.values(values).forEach((tensor) => tensor.dispose())
}

interface ScorerTraining {
  readonly targets: readonly number[]
  readonly learningRate: number
  readonly cache: FeatureCache
}

interface LoadedModel {
  readonly features: InferenceSession
  readonly scorer: InferenceSession
  readonly tokenizer: Tokenizer
  readonly manifest: Manifest
  readonly special: SpecialTokens
}

interface FeatureCache {
  readonly values: Map<string, Float32Array>
  bytes: number
}

/** Owns the frozen feature session and the trainable Laya scorer. */
export class LayaWasm {
  private parameters: Float32Array
  private steps = 0
  private busy = false
  private closed = false

  private constructor(
    private readonly model: LoadedModel,
    parameters: Float32Array,
  ) {
    this.parameters = parameters
  }

  static async load(options: LoadOptions): Promise<LayaWasm> {
    const base = new URL(
      options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`,
      globalThis.location?.href,
    )
    const readJson = async (path: string): Promise<unknown> =>
      (await fetchFile(new URL(path, base), options.signal)).json()
    const manifest = parseManifest(await readJson('manifest.json'))
    const [vocabulary, configuration, buffer] = await Promise.all([
      readJson('tokenizer/tokenizer.json'),
      readJson('tokenizer/tokenizer_config.json'),
      fetchFile(new URL('parameters.bin', base), options.signal).then((response) =>
        response.arrayBuffer(),
      ),
    ])
    const parameters = new Float32Array(buffer)
    validateCheckpoint(
      {modelId: manifest.modelId, parameters, steps: 0, version: 1},
      manifest.modelId,
      parameterCount(manifest),
    )
    if (options.checkpoint !== undefined) {
      validateCheckpoint(options.checkpoint, manifest.modelId, parameters.length)
    }
    const tokenizer = new Tokenizer(readObject(vocabulary), readObject(configuration))
    const special = resolveSpecialTokens(tokenizer, readObject(configuration))
    // A single thread also works in hosts without cross-origin isolation.
    env.wasm.numThreads = 1
    const features = await InferenceSession.create(new URL('features.onnx', base).href, {
      executionProviders: ['wasm'],
      externalData: manifest.externalData.map((path) => ({data: new URL(path, base).href, path})),
    })
    let scorer: InferenceSession | undefined
    try {
      options.signal?.throwIfAborted()
      scorer = await InferenceSession.create(new URL('scorer.onnx', base).href, {
        executionProviders: ['wasm'],
      })
      options.signal?.throwIfAborted()
      const instance = new LayaWasm({features, manifest, scorer, special, tokenizer}, parameters)
      if (options.checkpoint !== undefined) {
        instance.restoreCheckpoint(options.checkpoint)
      }
      return instance
    } catch (cause) {
      await Promise.all([features.release(), scorer?.release()])
      throw cause
    }
  }

  private assertAvailable(): void {
    if (this.closed) {
      throw new Error('LayaWasm is closed.')
    }
    if (this.busy) {
      throw new Error('LayaWasm already has an active operation.')
    }
  }

  private batch(state: JsonValue, questions: readonly Question[]) {
    return createBatch({
      config: {
        headLength: this.model.manifest.config.headLength,
        maxLength: this.model.manifest.config.maxLength,
      },
      encode: (text) => this.model.tokenizer.encode(text, {add_special_tokens: false}).ids,
      questions,
      special: this.model.special,
      state,
    })
  }

  private parameterFeeds(): Record<string, Tensor> {
    let offset = 0
    return Object.fromEntries(
      this.model.manifest.parameters.map((parameter) => {
        const size = parameter.dimensions.reduce((product, dimension) => product * dimension, 1)
        const data = this.parameters.subarray(offset, offset + size)
        offset += size
        return [parameter.name, new Tensor('float32', data, parameter.dimensions)]
      }),
    )
  }

  private async runScorer(
    state: JsonValue,
    questions: readonly Question[],
    training?: ScorerTraining,
  ) {
    const batch = this.batch(state, questions)
    const cache = training?.cache
    const targets = training?.targets
    const key = JSON.stringify([batch.sequences, questions.map((question) => question.type)])
    const feeds: Record<string, Tensor> = batch.feeds
    let extracted: InferenceSession.ReturnType = {}
    let inputs: Record<string, Tensor> = {}
    try {
      const cached = cache?.values.get(key)
      extracted =
        cached === undefined
          ? await this.model.features.run(
              Object.fromEntries(
                this.model.features.inputNames.map((name) => {
                  const tensor = feeds[name]
                  if (tensor === undefined) {
                    throw new Error(`Unsupported feature input: ${name}`)
                  }
                  return [name, tensor]
                }),
              ),
            )
          : {
              [this.model.manifest.featureOutput]: new Tensor('float32', cached, [
                batch.count,
                batch.columns,
                this.model.manifest.width,
              ]),
            }
      const features = extracted[this.model.manifest.featureOutput]
      if (features === undefined) {
        throw new Error('Feature model did not return marker embeddings.')
      }
      // Only the scorer changes during this train call; bound retained feature memory.
      const cacheLimit = 33_554_432
      if (
        cache !== undefined &&
        cached === undefined &&
        features.data instanceof Float32Array &&
        cache.bytes + features.data.byteLength <= cacheLimit
      ) {
        const data = features.data.slice()
        cache.values.set(key, data)
        cache.bytes += data.byteLength
      }
      inputs = {
        ...this.parameterFeeds(),
        features,
        learning_rate: new Tensor('float32', Float32Array.of(training?.learningRate ?? 0), []),
        marker_mask: batch.feeds.marker_mask,
        targets: new Tensor(
          'float32',
          targets === undefined
            ? new Float32Array(batch.count * batch.columns)
            : Float32Array.from(targets),
          [batch.count, batch.columns],
        ),
        temperature: new Tensor(
          'float32',
          Float32Array.from(
            questions.map((question) => questionTemperature(question, this.model.manifest.config)),
          ),
          [batch.count, 1],
        ),
      }
      const outputs =
        targets === undefined
          ? await this.model.scorer.run(inputs, ['logits'])
          : await this.model.scorer.run(inputs)
      return {batch, outputs}
    } finally {
      // Feature and mask tensors are borrowed by the scorer input map.
      dispose(
        Object.fromEntries(
          Object.entries(inputs).filter(([name]) => name !== 'features' && name !== 'marker_mask'),
        ),
      )
      dispose(extracted)
      dispose(feeds)
    }
  }

  async systemOne(
    state: JsonValue,
    questions: Readonly<Record<string, Question>>,
  ): Promise<DecisionResult> {
    this.assertAvailable()
    this.busy = true
    try {
      const entries = Object.entries(questions)
      const {outputs, batch} = await this.runScorer(
        state,
        entries.map(([, question]) => question),
      )
      try {
        const logits = outputs.logits?.data
        if (!(logits instanceof Float32Array)) {
          throw new Error('Expected float32 scorer logits.')
        }
        return {
          answers: Object.fromEntries(
            entries.map(([key, question], row) => [
              key,
              decodeAnswer(
                question,
                Array.from(
                  logits.subarray(
                    row * batch.columns,
                    row * batch.columns + batch.sequences[row].markers.length,
                  ),
                ),
                questionTemperature(question, this.model.manifest.config),
              ),
            ]),
          ),
          inputTokens: batch.sequences.reduce((sum, sequence) => sum + sequence.ids.length, 0),
        }
      } finally {
        dispose(outputs)
      }
    } finally {
      this.busy = false
    }
  }

  private async trainExample(
    example: TrainingExample,
    learningRate: number,
    cache: FeatureCache,
  ): Promise<number> {
    const {outputs} = await this.runScorer(example.state, [example.question], {
      cache,
      learningRate,
      targets: example.target,
    })
    try {
      const loss = outputs.loss?.data[0]
      if (typeof loss !== 'number' || !Number.isFinite(loss)) {
        throw new Error('Training returned a nonfinite loss.')
      }
      const parameters = new Float32Array(this.parameters.length)
      let offset = 0
      this.model.manifest.parameters.forEach((parameter) => {
        const data = outputs[`next_${parameter.name}`]?.data
        const size = parameter.dimensions.reduce((product, dimension) => product * dimension, 1)
        if (
          !(data instanceof Float32Array) ||
          data.length !== size ||
          !data.every(Number.isFinite)
        ) {
          throw new Error('Training returned invalid parameters; the previous step is preserved.')
        }
        parameters.set(data, offset)
        offset += data.length
      })
      this.parameters = parameters
      this.steps += 1
      return loss
    } finally {
      dispose(outputs)
    }
  }

  async train(
    examples: readonly TrainingExample[],
    options: TrainOptions = {},
  ): Promise<TrainingResult> {
    this.assertAvailable()
    const epochs = options.epochs ?? 1
    const defaultRate = 0.001
    const targetTolerance = 1e-5
    const rate = options.learningRate ?? defaultRate
    if (
      !Number.isSafeInteger(epochs) ||
      epochs < 1 ||
      !Number.isFinite(rate) ||
      rate <= 0 ||
      examples.length === 0
    ) {
      throw new TypeError(
        'Training requires examples, positive epochs and a positive finite learning rate.',
      )
    }
    examples.forEach(({question, target}) => {
      const total = target.reduce((sum, value) => sum + value, 0)
      if (
        target.length !== renderOptions(question).length ||
        !target.every((value) => Number.isFinite(value) && value >= 0) ||
        Math.abs(total - 1) > targetTolerance
      ) {
        throw new TypeError(
          'Targets must be nonnegative distributions in option order summing to one.',
        )
      }
    })
    this.busy = true
    let count = 0
    let total = 0
    const cache: FeatureCache = {bytes: 0, values: new Map()}
    try {
      for (let epoch = 0; epoch < epochs; epoch += 1) {
        for (const [index, example] of examples.entries()) {
          if (options.signal?.aborted) {
            return {meanLoss: count === 0 ? null : total / count, status: 'cancelled', steps: count}
          }
          // SGD updates depend on the weights committed by the preceding example.
          // eslint-disable-next-line no-await-in-loop
          const loss = await this.trainExample(example, rate, cache)
          count += 1
          total += loss
          options.onProgress?.({epoch: epoch + 1, example: index + 1, loss, steps: this.steps})
          // Process browser cancellation events before starting the next SGD step.
          // eslint-disable-next-line no-await-in-loop
          await yieldToBrowser()
        }
      }
      return {meanLoss: total / count, status: 'completed', steps: count}
    } finally {
      this.busy = false
    }
  }

  exportCheckpoint(): Checkpoint {
    this.assertAvailable()
    return {
      modelId: this.model.manifest.modelId,
      parameters: this.parameters.slice(),
      steps: this.steps,
      version: 1,
    }
  }

  restoreCheckpoint(checkpoint: Checkpoint): void {
    this.assertAvailable()
    validateCheckpoint(checkpoint, this.model.manifest.modelId, this.parameters.length)
    this.parameters = checkpoint.parameters.slice()
    this.steps = checkpoint.steps
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }
    this.assertAvailable()
    this.closed = true
    await Promise.all([this.model.features.release(), this.model.scorer.release()])
  }
}
