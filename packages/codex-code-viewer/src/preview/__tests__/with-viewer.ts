import {type BrowserType, chromium, type FrameLocator, type Page} from 'playwright'
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

/** Runs real UI interactions against built assets and releases browser, sessions and backend on failure too. */
export const withViewer = async <Value>(
  options: WithViewerOptions,
  exercise: (viewer: ViewerFixture) => Promise<Value>,
): Promise<Value> => {
  const preview = await createPreview(options)
  const browser = await (options.engine ?? chromium)
    .launch({headless: true})
    .catch(async (error) => {
      await preview.close()
      throw error
    })
  try {
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
    const sessions = new Set<string>()
    const received = new Set<Promise<void>>()
    page.on('response', (response) => {
      if (response.url() === `${preview.url}initial`) {
        const task = response.json().then((input: unknown) => {
          const result = CallToolResultSchema.parse(input)
          const session = result.structuredContent?.session
          if (typeof session === 'string') {
            sessions.add(session)
          }
        })
        received.add(task)
        task.finally(() => received.delete(task)).catch(() => undefined)
      }
    })
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
    const releaseSessions = async (): Promise<void> => {
      await Promise.all(received)
      await Promise.all([...sessions].map((session) => call('code.close', {session})))
      sessions.clear()
    }
    try {
      const result = await exercise({
        ...preview,
        app: page.frameLocator('iframe'),
        call,
        errors,
        page,
        releaseSessions,
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
        `${error instanceof Error ? error.message : String(error)}\nViewer state: ${state.slice(0, MAX_STATE_LENGTH)}`,
        {cause: error},
      )
    } finally {
      await releaseSessions()
    }
  } finally {
    try {
      await browser.close()
    } finally {
      await preview.close()
    }
  }
}
