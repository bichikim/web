import type {App} from '@modelcontextprotocol/ext-apps'
import type {ContentBlock} from '@modelcontextprotocol/sdk/types.js'
import {CONTEXT_SEPARATOR, MAX_CONTEXT_BYTES, MAX_CONTEXT_ITEMS} from '../shared/context-limits'
import type {ViewerContext, ViewerPort} from './types'
import type {createPendingTasks} from './create-pending-tasks'
import {formatContext} from './format-context'
import {errorMessage} from './error-message'

interface HostContextSnapshot {
  readonly updateId: string
  readonly content?: readonly ContentBlock[]
}
interface HostContextOptions {
  readonly app: Pick<App, 'updateModelContext'>
  readonly call: ViewerPort['call']
  readonly requests: ReturnType<typeof createPendingTasks>
  readonly standard: boolean
  readonly current: () => HostContextSnapshot | null | undefined
  readonly stage?: (content: readonly string[]) => Promise<void>
}

/** Serializes attachment updates and preserves the last accepted context when an update fails. */
export const createHostContext = (options: HostContextOptions) => {
  let contexts: string[] = []
  let observed: string | null | undefined
  let queue: Promise<void> = Promise.resolve()
  const listeners = new Set<(contexts: readonly string[] | null) => void>()
  const publish = (): void => {
    listeners.forEach((receive) => receive(options.standard ? [...contexts] : null))
  }
  const update = (
    transform: (current: readonly string[]) => string[] | Promise<string[]>,
  ): Promise<void> => {
    const previous = queue
    const task = options.requests.run(async () => {
      await previous
      const transformed = transform(contexts)
      const next = Array.isArray(transformed) ? transformed : await transformed
      if (
        options.standard &&
        (next.length > MAX_CONTEXT_ITEMS ||
          new TextEncoder().encode(next.join(CONTEXT_SEPARATOR)).length > MAX_CONTEXT_BYTES)
      ) {
        throw new Error('채팅 첨부는 20개, 전체 64 KiB까지 추가할 수 있습니다.')
      }
      const payload = {content: next.map((text) => ({text, type: 'text' as const}))}
      if (options.stage === undefined) {
        await options.app.updateModelContext(payload)
      } else {
        await options.stage(next)
        // Some desktop hosts acknowledge context without forwarding it to the next model turn.
        await options.app.updateModelContext(payload).catch(() => undefined)
      }
      contexts = next
      publish()
    })
    // Each caller receives its failure; later attachment operations must still run.
    queue = task.then(
      () => undefined,
      () => undefined,
    )
    return task
  }
  const read = async (selection: ViewerContext): Promise<string> => {
    const result = await options.call('code.context', {
      path: selection.path,
      ...('kind' in selection ? {} : {endLine: selection.endLine, line: selection.line}),
    })
    if (result.isError) {
      throw new Error(errorMessage(result.structuredContent))
    }
    return result.content.flatMap((entry) => (entry.type === 'text' ? [entry.text] : [])).join('\n')
  }
  return {
    addTextContext: (text: string): Promise<void> => update((current) => [...current, text]),
    context: (selection: ViewerContext): Promise<void> => {
      const text = formatContext(selection)
      if (
        !options.standard ||
        ('kind' in selection && selection.kind !== 'file' && selection.kind !== 'directory')
      ) {
        return update((current) => [...current, text])
      }
      return update(async (current) => [...current, `${text}\n\n${await read(selection)}`])
    },
    removeContext: (index?: number): Promise<void> =>
      update((current) =>
        index === undefined ? [] : current.filter((_text, position) => position !== index),
      ),
    subscribeContext: (receive: (contexts: readonly string[] | null) => void): (() => void) => {
      listeners.add(receive)
      receive(options.standard ? [...contexts] : null)
      return () => {
        listeners.delete(receive)
      }
    },
    synchronize: (): void => {
      const current = options.current()
      if (current !== undefined && (current === null ? null : current.updateId) !== observed) {
        observed = current?.updateId ?? null
        contexts =
          current === null
            ? []
            : (current.content ?? []).flatMap((entry) =>
                entry.type === 'text' ? [entry.text] : [],
              )
      }
    },
  }
}
