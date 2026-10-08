import {App} from '@modelcontextprotocol/ext-apps'
import type {Protocol} from '@modelcontextprotocol/sdk/shared/protocol.js'
import type {Notification, Request, Result} from '@modelcontextprotocol/sdk/types.js'
import {z} from 'zod'
import manifest from '../../package.json'
import {OpenAIExtensions, OpenAIFileEntrypointInputSchema} from '@openai/mcp-extensions/app'
import {connectionSchema} from '../shared/contracts'
import type {ViewerPort} from './types'
import {connectHostAppearance} from './connect-host-appearance'
import {formatContext} from './format-context'
import {createPendingTasks} from './create-pending-tasks'

export const createHost = (): ViewerPort => {
  const app = new App({name: 'Code Viewer', version: manifest.version}, {}, {autoResize: false})
  const extensions = new OpenAIExtensions(app)
  // The base protocol carries custom methods, as in the OpenAI extensions adapter.
  const protocol = app as unknown as Protocol<Request, Notification, Result>
  const requests = createPendingTasks()
  const call: ViewerPort['call'] = (name, arguments_) =>
    requests.run(() => app.callServerTool({arguments: arguments_, name}))
  let contexts: string[] = []
  let observedContextId: string | null | undefined
  let contextQueue: Promise<void> = Promise.resolve()
  const synchronizeContext = (): void => {
    const current = extensions.modelContext?.getCurrent()
    if (
      current !== undefined &&
      (current === null ? null : current.updateId) !== observedContextId
    ) {
      observedContextId = current?.updateId ?? null
      contexts =
        current === null
          ? []
          : (current.content ?? []).flatMap((entry) => (entry.type === 'text' ? [entry.text] : []))
    }
  }
  return {
    call,
    context: (selection) => {
      const text = formatContext(selection)
      const previous = contextQueue
      const task = requests.run(async () => {
        await previous
        const next = [...contexts, text]
        await app.updateModelContext({
          content: next.map((entry) => ({text: entry, type: 'text'})),
        })
        contexts = next
      })
      // Each caller receives its failure; subsequent additions must still run.
      contextQueue = task.then(
        () => undefined,
        () => undefined,
      )
      return task
    },
    location: async (location) => {
      const capability =
        app.getHostCapabilities()?.experimental?.['winter-love/file-viewer/location']
      if (!z.object({version: z.literal(1)}).safeParse(capability).success) {
        return
      }
      await requests.run(() =>
        protocol.request(
          {method: 'winter-love/file-viewer/location', params: {...location}},
          z.object({}),
        ),
      )
    },
    start: async (receive, report, refresh, onTeardown) => {
      let resource: string | null = null
      let stopped = false
      const handleResult = (result: {
        isError?: boolean
        structuredContent?: Record<string, unknown>
      }): void => {
        if (result.isError) {
          report(result.structuredContent)
          return
        }
        const parsed = connectionSchema.safeParse(result.structuredContent)
        if (parsed.success) {
          receive(parsed.data)
        }
      }
      const handleFile = async (input: {arguments?: Record<string, unknown>}): Promise<void> => {
        const parsed = OpenAIFileEntrypointInputSchema.safeParse(input.arguments)
        if (!parsed.success) {
          return
        }
        await connected
        if (stopped) {
          return
        }
        const result = await call('code.attach', {})
        if (result.isError) {
          report(result.structuredContent)
          return
        }
        handleResult(result)
        if (stopped) {
          return
        }
        if (resource !== null) {
          await extensions.resources?.unsubscribe({uri: resource})
        }
        if (stopped) {
          return
        }
        resource = parsed.data.file.resourceUri
        await extensions.resources?.subscribe({uri: resource})
      }
      const handleInput = (input: {arguments?: Record<string, unknown>}): void => {
        requests.run(() => handleFile(input)).catch(report)
      }
      const removeListeners = (): void => {
        app.removeEventListener('toolresult', handleResult)
        app.removeEventListener('toolinput', handleInput)
        app.removeEventListener('hostcontextchanged', synchronizeContext)
      }
      app.addEventListener('toolresult', handleResult)
      app.addEventListener('toolinput', handleInput)
      app.addEventListener('hostcontextchanged', synchronizeContext)
      app.onteardown = async () => {
        await onTeardown?.()
        return {}
      }
      const connected = app.connect()
      try {
        await connected
      } catch (error) {
        stopped = true
        removeListeners()
        await requests.settle()
        await app.close().catch(report)
        throw error
      }
      synchronizeContext()
      const disposeAppearance = connectHostAppearance(app)
      const disposeUpdates = extensions.resources?.addUpdateHandler(() => refresh())
      return async () => {
        stopped = true
        disposeAppearance()
        disposeUpdates?.()
        removeListeners()
        await requests.settle()
        if (resource !== null) {
          await extensions.resources?.unsubscribe({uri: resource}).catch(report)
        }
        await app.close().catch(report)
      }
    },
  }
}
