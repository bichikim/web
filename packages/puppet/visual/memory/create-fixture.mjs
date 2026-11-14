/* eslint-disable no-await-in-loop -- Each operation must finish before its owner is released. */
/* eslint-disable no-magic-numbers -- Literal values define the repeated stress-test interactions. */
import {createPlayback} from './create-playback.mjs'
const createNumericFixture = async (document, workerPath, deltaTime) => {
  const worker = new Worker(`/dist/${workerPath}`, {type: 'module'})
  const pending = new Map()
  let sequence = 0
  const request = (message) =>
    new Promise((resolve, reject) => {
      sequence += 1
      pending.set(sequence, {reject, resolve})
      worker.postMessage(
        {...message, id: sequence},
        message.request ? [message.request.buffer] : [],
      )
    })
  worker.onmessage = ({data}) => {
    const reply = pending.get(data.id)
    if (reply !== undefined) {
      pending.delete(data.id)
      if (data.kind === 'error') {
        reply.reject(new Error(data.message))
      } else {
        reply.resolve(data)
      }
    }
  }
  worker.onerror = (event) => {
    for (const item of pending.values()) {
      item.reject(new Error(event.message))
    }
    pending.clear()
  }
  const numeric = {
    ...document,
    parts: document.parts.map((part) => ({...part, texture: {...part.texture, src: ''}})),
    textureAssets: undefined,
  }
  const initialization = await request({
    audio: new Map(),
    document: numeric,
    kind: 'initialize',
  })
  let buffer = new ArrayBuffer(initialization.bytes)
  const initial = await request({
    kind: 'produce',
    request: {buffer, deltaTime: 0, generation: 0, time: 0},
  })
  const {buffer: initializedBuffer} = initial.frame.computed.vertices
  buffer = initializedBuffer
  const state = {
    ...initial.frame.state,
    playback: {
      ...initial.frame.state.playback,
      loop: true,
      motionId: document.motions[0]?.id,
      status: 'playing',
    },
    randomState: 42,
  }
  await request({generation: 1, inputRevision: 0, kind: 'reset', state})
  let frames = 0
  let acknowledgedNotices = 0
  return {
    async advance(count) {
      let queuedNotices = 0
      for (let index = 0; index < count; index += 1) {
        const result = await request({
          kind: 'produce',
          request: {
            acknowledgedNotices,
            buffer,
            deltaTime,
            generation: 1,
            time: frames * deltaTime,
          },
        })
        if (result.frame.kind !== 'frame') {
          throw new Error('Unexpected stale frame')
        }
        const {buffer: nextBuffer} = result.frame.computed.vertices
        buffer = nextBuffer
        acknowledgedNotices = result.frame.state.notices.sequence
        queuedNotices = Math.max(queuedNotices, result.frame.state.notices.pending.length)
        frames += 1
      }
      return {frames, pendingRequests: pending.size, queuedNotices}
    },
    disposeWorker() {
      worker.terminate()
    },
  }
}

const createLifecycle = (api, document) => async (cycle) => {
  const parsed = api.parseDocumentValue({
    ...document,
    parts: document.parts.map((part, index) =>
      index === 0
        ? {...part, properties: {...part.properties, opacity: cycle % 2 ? 0.8 : 0.9}}
        : part,
    ),
  })
  if (!parsed.ok) {
    throw new Error('Invalid replacement document')
  }
  const canvas = globalThis.document.createElement('canvas')
  globalThis.document.body.append(canvas)
  const player = await api.createPlayer({
    antialiasing: 'ssaa',
    buffering: true,
    canvas,
    document: parsed.document,
    randomSeed: 42,
    renderer: 'webgl',
    resolution: 1,
  })
  try {
    player.pause()
    player.setMotion(document.motions[0]?.id)
    player.seek(0.1)
    await api.flushPlayerInputs(player)
    for (let index = 0; index < 12; index += 1) {
      const parameter = document.parameters[index % document.parameters.length]
      if (parameter !== undefined) {
        player.setParameterValue(
          parameter.id,
          parameter.minimum +
            ((parameter.maximum - parameter.minimum) * ((index + cycle) % 10)) / 10,
        )
      }
      player.seek((index + 1) / 30)
      if ((await api.flushPlayerInputs(player)) !== 'applied') {
        throw new Error('Input was not presented')
      }
    }
    await api.configurePlayerBuffering(player, {enabled: false})
    await api.configurePlayerBuffering(player, {enabled: true})
    player.seek(0.7)
    await api.flushPlayerInputs(player)
    const {status} = api.getPlayerBufferingInfo(player)
    if (status !== 'idle' && status !== 'active') {
      throw new Error(`Worker failed: ${status}`)
    }
  } finally {
    player.destroy()
    canvas.remove()
  }
}

/** Loads the actual built player and owns independent numeric and GPU stress-test lifetimes. */
export const createMemoryFixture = async ({workerPath, deltaTime}) => {
  const api = await import('/dist/player.js')
  const source = await (await fetch('/model')).blob()
  const parsed = await api.parseDocumentBlob({source})
  if (!parsed.ok) {
    throw new Error('Invalid memory fixture')
  }
  const {document} = parsed
  const numeric = await createNumericFixture(document, workerPath, deltaTime)
  let playback
  globalThis.memoryFixture = {
    ...numeric,
    async advancePlayback(count) {
      playback ??= await createPlayback(api, document)
      return playback.advance(count)
    },
    disposePlayback() {
      playback.dispose()
      playback = undefined
    },
    lifecycle: createLifecycle(api, document),
  }
  return {
    parts: document.parts.length,
    userAgent: navigator.userAgent,
    vertices: document.parts.reduce((sum, part) => sum + part.mesh.vertices.length / 2, 0),
  }
}
