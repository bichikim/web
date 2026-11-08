import type {ServerResponse} from 'node:http'
import {randomUUID} from 'node:crypto'
import {type RenderedImage, type RenderInput, renderResultSchema} from '../render-types'

interface RenderJob {
  readonly clientId: string
  readonly resolve: (image: RenderedImage) => void
  readonly reject: (error: unknown) => void
}

/** Serializes captures and binds each result to its connected GUI. Disconnect rejects pending work. */
export const createRenderBroker = () => {
  const renderers = new Map<string, ServerResponse>()
  const jobs = new Map<string, RenderJob>()
  const render = (input: RenderInput): Promise<RenderedImage> => {
    const selected = renderers.entries().next().value
    if (selected === undefined) {
      return Promise.reject(new Error('requires-gui: open the connected Poffo GUI'))
    }
    if (jobs.size > 0) {
      return Promise.reject(new Error('busy: renderer is processing another capture'))
    }
    const [clientId, response] = selected
    const id = randomUUID()
    return new Promise<RenderedImage>((resolve, reject) => {
      const CAPTURE_LIMIT = 30_000
      const timeout = AbortSignal.timeout(CAPTURE_LIMIT)
      const release = () => {
        jobs.delete(id)
        timeout.removeEventListener('abort', abort)
      }
      const abort = () => {
        release()
        reject(new Error('render-timeout: renderer did not return a completed frame'))
      }
      timeout.addEventListener('abort', abort, {once: true})
      jobs.set(id, {
        clientId,
        reject: (error) => {
          release()
          reject(error)
        },
        resolve: (image) => {
          release()
          resolve(image)
        },
      })
      response.write(`${JSON.stringify({id, input, kind: 'render'})}\n`)
    })
  }
  return {
    attach: (clientId: string, response: ServerResponse) => {
      renderers.set(clientId, response)
    },
    complete: (clientId: string | string[] | undefined, value: unknown) => {
      const result = renderResultSchema.parse(value)
      const job = jobs.get(result.id)
      if (job === undefined || job.clientId !== clientId) {
        return false
      }
      if (result.result === undefined) {
        job.reject(new Error(result.error ?? 'render-failed: renderer returned no image'))
      } else {
        job.resolve(result.result)
      }
      return true
    },
    detach: (clientId: string) => {
      renderers.delete(clientId)
      for (const job of jobs.values()) {
        if (job.clientId === clientId) {
          job.reject(new Error('render-disconnected: GUI disconnected'))
        }
      }
    },
    render,
  }
}
