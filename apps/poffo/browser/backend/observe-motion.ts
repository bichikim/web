import type {Page} from 'playwright/test'

/** Observes real playback text updates through complete loops, without fixed waits. */
export const observeMotion = (page: Page) =>
  page.getByLabel('재생 시간', {exact: true}).evaluate(
    (element) =>
      new Promise<number[]>((resolve, reject) => {
        const times: number[] = []
        let previous = Number.parseFloat(element.textContent ?? '0')
        let cycles = 0
        const LIMIT = 20_000
        const deadline = AbortSignal.timeout(LIMIT)
        const close = () => {
          observer.disconnect()
          deadline.removeEventListener('abort', abort)
        }
        const abort = () => {
          close()
          reject(new Error('Motion did not complete two cycles'))
        }
        const observer = new MutationObserver(() => {
          const current = Number.parseFloat(element.textContent ?? '0')
          if (current < previous) {
            cycles += 1
          }
          previous = current
          times.push(current)
          if (cycles === 2) {
            close()
            resolve(times)
          }
        })
        deadline.addEventListener('abort', abort, {once: true})
        observer.observe(element, {characterData: true, childList: true, subtree: true})
      }),
  )
