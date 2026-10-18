import {type Checkpoint, LayaWasm} from '../../src/index'
import type {Command, Prompt, Reply, TrainingCommand} from './types'
import {trainAndEvaluate} from './train-and-evaluate'

declare const self: DedicatedWorkerGlobalScope
let model: LayaWasm | null = null
let initial: Checkpoint | null = null
let controller: AbortController | null = null
let busy = false
const reply = (message: Reply): void => self.postMessage(message)
const requireModel = (): LayaWasm => {
  if (model === null) {
    throw new Error('먼저 모델을 불러오세요.')
  }
  return model
}
const infer = async (prompt: Prompt) =>
  (await requireModel().systemOne(prompt.state, {answer: prompt.question})).answers.answer
const train = async (command: TrainingCommand): Promise<void> => {
  controller = new AbortController()
  try {
    reply(
      await trainAndEvaluate({
        command,
        model: requireModel(),
        onEvaluation: (progress) => reply({progress, type: 'evaluation-progress'}),
        onProgress: (progress) => reply({progress, type: 'progress'}),
        signal: controller.signal,
      }),
    )
  } finally {
    controller = null
  }
}

const execute = async (command: Command): Promise<void> => {
  switch (command.type) {
    case 'load':
      model = await LayaWasm.load({baseUrl: command.url})
      initial = model.exportCheckpoint()
      reply({type: 'ready'})
      return
    case 'infer':
      reply({
        comparison: {after: await infer(command.prompt), before: null, prompt: command.prompt},
        type: 'inferred',
      })
      return
    case 'train':
      await train(command)
      return
    case 'reset':
      if (initial === null) {
        throw new Error('초기 가중치가 없습니다.')
      }
      requireModel().restoreCheckpoint(initial)
      reply({type: 'reset'})
      return
    case 'export':
      reply({checkpoint: requireModel().exportCheckpoint(), type: 'exported'})
      return
    case 'restore':
      requireModel().restoreCheckpoint(command.checkpoint)
      reply({steps: command.checkpoint.steps, type: 'restored'})
      return
    case 'cancel':
      controller?.abort()
      return
    default: {
      const exhaustive: never = command
      throw new Error(`Unknown command: ${String(exhaustive)}`)
    }
  }
}

self.addEventListener('message', async (event: MessageEvent<Command>) => {
  if (event.data.type === 'cancel') {
    controller?.abort()
    return
  }
  if (busy) {
    reply({loaded: model !== null, message: '다른 작업이 진행 중입니다.', type: 'failed'})
    return
  }
  busy = true
  try {
    await execute(event.data)
  } catch (cause) {
    reply({
      loaded: model !== null,
      message: cause instanceof Error ? cause.message : String(cause),
      type: 'failed',
    })
  } finally {
    busy = false
  }
})
