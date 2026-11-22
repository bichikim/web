import {
  type Browser,
  type BrowserType,
  chromium,
  type FrameLocator,
  type Page,
  type Response,
} from 'playwright'
import {type CallToolResult, CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {createPreview, type CreatePreviewOptions, type Preview} from './create-preview'

export interface WithViewerOptions extends CreatePreviewOptions {
  /** Browser owned and closed by this fixture; Chromium is used when omitted. */
  readonly engine?: BrowserType
}
export interface ViewerFixture extends Preview {
  readonly page: Page
  readonly app: FrameLocator
  readonly errors: readonly string[]
  call(name: string, input?: Record<string, unknown>): Promise<CallToolResult>
  /** Releases every session received by this page, including after navigation or reload. */
  releaseSessions(): Promise<void>
}

const trackSessions = (page: Page, initialUrl: string, call: ViewerFixture['call']) => {
  const sessions = new Set<string>()
  const pending = new Set<Promise<void>>()
  const receiptFailures: unknown[] = []
  const receive = (response: Response): void => {
    if (response.url() !== initialUrl) {
      return
    }
    const task = response
      .json()
      .then((input: unknown) => {
        const result = CallToolResultSchema.parse(input)
        const session = result.structuredContent?.session
        if (typeof session === 'string') {
          sessions.add(session)
        }
      })
      .catch((error: unknown) => {
        receiptFailures.push(error)
      })
      .finally(() => {
        pending.delete(task)
      })
    pending.add(task)
  }
  page.on('response', receive)
  const release = async (): Promise<void> => {
    await Promise.all(pending)
    const closed = await Promise.allSettled(
      [...sessions].map(async (session) => {
        await call('code.close', {session})
        sessions.delete(session)
      }),
    )
    const failures = [
      ...receiptFailures.splice(0),
      ...closed.flatMap((outcome) => (outcome.status === 'rejected' ? [outcome.reason] : [])),
    ]
    if (failures.length === 1) {
      throw failures[0]
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, 'Viewer sessions failed to close.')
    }
  }
  return {release, stop: () => page.off('response', receive)}
}

/** Runs real UI interactions against built assets and releases browser, sessions and backend on failure too. */
export const withViewer = async <Value>(
  options: WithViewerOptions,
  exercise: (viewer: ViewerFixture) => Promise<Value>,
): Promise<Value> => {
  const preview = await createPreview(options)
  let browser: Browser | undefined
  let closeSessions: (() => Promise<void>) | undefined
  const run = async () => {
    browser = await (options.engine ?? chromium).launch({headless: true})
    const page = await browser.newPage({
      hasTouch: true,
      locale: 'ko-KR',
      viewport: {height: 850, width: 1120},
    })
    const ACTION_DEADLINE_MS = 5000
    page.setDefaultTimeout(ACTION_DEADLINE_MS)
    await page.addInitScript(() => localStorage.setItem('codex-code-viewer.language', 'ko'))
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const call = async (
      name: string,
      input: Record<string, unknown> = {},
    ): Promise<CallToolResult> => {
      const response = await page.request.post(`${preview.url}tool`, {
        data: {arguments: input, name},
      })
      if (!response.ok()) {
        throw new Error(`Preview ${name}: ${response.status()} ${await response.text()}`)
      }
      return CallToolResultSchema.parse(await response.json())
    }
    const sessions = trackSessions(page, `${preview.url}initial`, call)
    closeSessions = () => {
      sessions.stop()
      return sessions.release()
    }
    try {
      const result = await exercise({
        ...preview,
        app: page.frameLocator('iframe'),
        call,
        errors,
        page,
        releaseSessions: sessions.release,
      })
      if (errors.length > 0) {
        throw new Error(`Unhandled viewer errors: ${errors.join('; ')}`)
      }
      return result
    } catch (error) {
      const state = await page
        .frameLocator('iframe')
        .locator('body')
        .innerText({timeout: 1000})
        .catch(() => 'unavailable')
      const MAX_STATE_LENGTH = 6000
      throw new Error(
        [
          error instanceof Error ? error.message : String(error),
          `Viewer state: ${state.slice(0, MAX_STATE_LENGTH)}`,
          `Preview stderr: ${preview.stderr()}`,
        ].join('\n'),
        {cause: error},
      )
    }
  }
  const [outcome] = await Promise.allSettled([run()])
  const cleanupFailures: unknown[] = []
  const collectCleanupFailure = async (close: () => Promise<void> | undefined) => {
    try {
      await close()
    } catch (error) {
      cleanupFailures.push(error)
    }
  }
  await collectCleanupFailure(() => closeSessions?.())
  await collectCleanupFailure(() => browser?.close())
  await collectCleanupFailure(() => preview.close())
  if (cleanupFailures.length > 0) {
    throw new AggregateError(
      outcome.status === 'rejected' ? [outcome.reason, ...cleanupFailures] : cleanupFailures,
      `Viewer cleanup failed.\nPreview stderr: ${preview.stderr()}`,
    )
  }
  if (outcome.status === 'rejected') {
    throw outcome.reason
  }
  return outcome.value
}
