import {mkdir, writeFile} from 'node:fs/promises'
import {join} from 'node:path'

/**
 * Starts CPU sampling in the benchmark's page and its playback Worker.
 * @param {object} options Profiling destinations and borrowed browser resources.
 * @param {'main' | 'worker'} options.computation Backend whose thread must be sampled.
 * @param {string} options.directory Explicit directory for Chrome .cpuprofile files.
 * @param {string} options.name Run name used to keep measurements separate.
 * @param {import('playwright').CDPSession} options.session Page session, owned by the caller.
 * @returns {Promise<{stop: () => Promise<string[]>}>} Stops sampling and writes the profile files.
 */
export const capturePlaybackProfile = async (options) => {
  const {session} = options
  await mkdir(options.directory, {recursive: true})
  await session.send('Profiler.enable')
  await session.send('Profiler.start')
  let workerSession
  let sequence = 0
  const pending = new Map()
  const receive = ({message, sessionId}) => {
    if (sessionId !== workerSession) {
      return
    }
    const response = JSON.parse(message)
    const request = pending.get(response.id)
    if (request !== undefined) {
      pending.delete(response.id)
      if (response.error === undefined) {
        request.resolve(response.result)
      } else {
        request.reject(new Error(JSON.stringify(response.error)))
      }
    }
  }
  const detached = ({sessionId}) => {
    if (sessionId === workerSession) {
      for (const request of pending.values()) {
        request.reject(new Error('Playback Worker closed during CPU profiling'))
      }
      pending.clear()
    }
  }
  const sendWorker = (method) =>
    new Promise((resolve, reject) => {
      sequence += 1
      const id = sequence
      pending.set(id, {reject, resolve})
      session
        .send('Target.sendMessageToTarget', {
          message: JSON.stringify({id, method}),
          sessionId: workerSession,
        })
        .catch((error) => {
          pending.delete(id)
          reject(error)
        })
    })
  if (options.computation === 'worker') {
    const {targetInfo: page} = await session.send('Target.getTargetInfo')
    const {targetInfos} = await session.send('Target.getTargets')
    const target = targetInfos.find(
      (candidate) =>
        candidate.type === 'worker' &&
        candidate.browserContextId === page.browserContextId &&
        new URL(candidate.url).pathname.includes('/assets/worker-'),
    )
    if (target === undefined) {
      await session.send('Profiler.stop')
      throw new Error('Playback Worker target was not found; refusing to profile a fallback')
    }
    session.on('Target.receivedMessageFromTarget', receive)
    session.on('Target.detachedFromTarget', detached)
    const attached = await session.send('Target.attachToTarget', {
      flatten: false,
      targetId: target.targetId,
    })
    workerSession = attached.sessionId
    await sendWorker('Profiler.enable')
    await sendWorker('Profiler.start')
  }
  return {
    async stop() {
      const files = []
      try {
        const main = await session.send('Profiler.stop')
        const mainFile = join(options.directory, `${options.name}-main.cpuprofile`)
        await writeFile(mainFile, JSON.stringify(main.profile))
        files.push(mainFile)
        if (workerSession !== undefined) {
          const worker = await sendWorker('Profiler.stop')
          const workerFile = join(options.directory, `${options.name}-worker.cpuprofile`)
          await writeFile(workerFile, JSON.stringify(worker.profile))
          files.push(workerFile)
        }
        return files
      } finally {
        session.off('Target.receivedMessageFromTarget', receive)
        session.off('Target.detachedFromTarget', detached)
        if (workerSession !== undefined) {
          await session.send('Target.detachFromTarget', {sessionId: workerSession})
        }
      }
    },
  }
}
