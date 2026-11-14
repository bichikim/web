/** Owns a real displayed player; frame notifications delimit each memory checkpoint. */
export const createPlayback = async (api, document) => {
  let frames = 0
  let notify
  const canvas = globalThis.document.createElement('canvas')
  canvas.width = 900
  canvas.height = 700
  globalThis.document.body.append(canvas)
  const player = await api.createPlayer({
    antialiasing: 'ssaa',
    buffering: true,
    canvas,
    document,
    motionId: document.motions[0]?.id,
    onFrame: () => {
      frames += 1
      notify?.()
    },
    randomSeed: 42,
    renderer: 'webgl',
    resolution: 1,
  })
  player.setEyeBlink(false)
  player.setBreath(false)
  return {
    async advance(count) {
      const target = frames + count
      const completed = new Promise((resolve) => {
        notify = () => {
          if (frames >= target) {
            notify = undefined
            resolve()
          }
        }
      })
      player.play({loop: true})
      await completed
      player.pause()
      if ((await api.flushPlayerInputs(player)) !== 'applied') {
        throw new Error('Playback checkpoint was not applied')
      }
      return frames
    },
    dispose() {
      player.destroy()
      canvas.remove()
    },
  }
}
