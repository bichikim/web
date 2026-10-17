import {LayaWasm, type TrainingProgress} from '../src/index'

const bundle = new URLSearchParams(location.search).get('bundle')
if (bundle === null) {
  throw new Error('A prepared model bundle is required.')
}

const question = {
  criteria: ['accept', 'reject'],
  instructions: 'Should this request be accepted?',
  type: 'choice',
} as const
const state = 'Please let me change the name on my account.'
const model = await LayaWasm.load({baseUrl: bundle})
try {
  const before = await model.systemOne(state, {decision: question})
  const midpoint = 0.5
  const target = before.answers.decision.probabilities.accept < midpoint ? [1, 0] : [0, 1]
  const label = target[0] === 1 ? 'accept' : 'reject'
  const initial = model.exportCheckpoint()
  const progress: TrainingProgress[] = []
  const result = await model.train([{question, state, target}], {
    epochs: 5,
    learningRate: 0.001,
    onProgress: (value) => progress.push(value),
  })
  const after = await model.systemOne(state, {decision: question})
  const checkpoint = model.exportCheckpoint()
  model.restoreCheckpoint(initial)
  const reset = await model.systemOne(state, {decision: question})
  // IndexedDB uses structured cloning, preserving Float32Array checkpoint parameters.
  const saved = structuredClone(checkpoint)
  model.restoreCheckpoint(saved)
  const restored = await model.systemOne(state, {decision: question})
  const controller = new AbortController()
  controller.abort()
  const cancelled = await model.train([{question, state, target}], {signal: controller.signal})
  const unchanged = model.exportCheckpoint()
  const mixed = await model.systemOne(state, {
    choice: question,
    noul: {instructions: 'The customer requests an account change.', type: 'noul'},
    score: {criteria: ['low', 'medium', 'high'], instructions: 'How urgent is it?', type: 'score'},
  })
  const verification = {
    after: after.answers.decision.probabilities[label],
    before: before.answers.decision.probabilities[label],
    cancelled,
    checkpointSteps: checkpoint.steps,
    losses: progress.map((value) => value.loss),
    mixed,
    original: before,
    reset,
    restored,
    result,
    trained: after,
    unchanged: unchanged.steps === checkpoint.steps,
    weightsChanged: checkpoint.parameters.some(
      (value, index) => value !== initial.parameters[index],
    ),
  }
  await model.close()
  const reloaded = await LayaWasm.load({baseUrl: bundle, checkpoint: saved})
  try {
    const loaded = await reloaded.systemOne(state, {decision: question})
    Object.assign(globalThis, {result: {...verification, loaded}})
  } finally {
    await reloaded.close()
  }
} finally {
  await model.close()
}
