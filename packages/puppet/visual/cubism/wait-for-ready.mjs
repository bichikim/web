const INITIALIZATION_LIMIT = 10000
export const waitForReady = (check, signal) =>
  new Promise((resolve, reject) => {
    let started
    let frame
    const abort = () => {
      cancelAnimationFrame(frame)
      reject(signal.reason)
    }
    signal.addEventListener('abort', abort, {once: true})
    const tick = (time) => {
      started ??= time
      if (check()) {
        signal.removeEventListener('abort', abort)
        resolve()
        return
      }
      if (time - started > INITIALIZATION_LIMIT) {
        signal.removeEventListener('abort', abort)
        reject(new Error('SDK 초기화가 완료되지 않았습니다.'))
        return
      }
      frame = requestAnimationFrame(tick)
    }
    if (signal.aborted) {
      abort()
    } else {
      frame = requestAnimationFrame(tick)
    }
  })
