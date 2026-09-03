/** @vitest-environment jsdom */

import {createHandler, StartServer} from '@solidjs/start/server'
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getLocale, getTextDirection} from '@paraglide/runtime'

vi.mock('@solidjs/start/server', () => ({createHandler: vi.fn(), StartServer: vi.fn()}))
vi.mock('@paraglide/runtime', () => ({getLocale: vi.fn(), getTextDirection: vi.fn()}))

const solidWebMocks = vi.hoisted(() => ({
  insert: vi.fn(),
  setAttribute: vi.fn(),
  template: vi.fn(),
}))

vi.mock('solid-js/web', async () => {
  const actual = await vi.importActual<typeof import('solid-js/web')>('solid-js/web')

  return {
    ...actual,
    insert: solidWebMocks.insert,
    setAttribute: solidWebMocks.setAttribute,
    template: solidWebMocks.template,
  }
})

interface EntryEvent {
  readonly locals: {
    readonly securityNonce: string
  }
}

let renderedDocument: HTMLHtmlElement | undefined
let insertedValues: unknown[] = []
const readAssets = vi.fn(() => 'asset-slot')
const readChildren = vi.fn(() => 'children-slot')
const readScripts = vi.fn(() => 'script-slot')

const executeRegisteredHandler = () => {
  const [renderPage, getHandlerOptions] = vi.mocked(createHandler).mock.calls.at(-1) ?? []

  if (renderPage === undefined || typeof getHandlerOptions !== 'function') {
    throw new Error('Entry server handler was not registered')
  }

  const event = {
    locals: {securityNonce: 'nonce-value'},
  } as unknown as Parameters<typeof renderPage>[0]

  let disposeRoot: () => void = () => undefined
  createRoot((dispose) => {
    disposeRoot = dispose
    renderPage(event)
  })
  disposeRoot()

  return getHandlerOptions(event)
}

describe('entry-server', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
    vi.mocked(getLocale).mockReturnValue('ko')
    vi.mocked(getTextDirection).mockReturnValue('rtl')
    solidWebMocks.template.mockImplementation((html) => {
      const cloneTemplate = () =>
        new DOMParser().parseFromString(html, 'text/html').documentElement.cloneNode(true)
      cloneTemplate.cloneNode = cloneTemplate
      return cloneTemplate
    })
    solidWebMocks.setAttribute.mockImplementation((element, name, value) => {
      element.setAttribute(name, String(value))
    })
    solidWebMocks.insert.mockImplementation((_parent, value) => {
      insertedValues.push(typeof value === 'function' ? value() : value)
    })
    vi.mocked(StartServer).mockImplementation((props) => {
      renderedDocument = props.document({
        get assets() {
          return readAssets()
        },
        get children() {
          return readChildren()
        },
        get scripts() {
          return readScripts()
        },
      }) as HTMLHtmlElement
      return null
    })
  })

  afterEach(() => {
    renderedDocument = undefined
    insertedValues = []
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('should register the default web document and nonce handler', async () => {
    await import('../entry-server')

    expect(executeRegisteredHandler()).toEqual({nonce: 'nonce-value'})
    expect(StartServer).toHaveBeenCalledOnce()
    expect(getLocale).toHaveBeenCalledOnce()
    expect(getTextDirection).toHaveBeenCalledOnce()

    const documentElement = renderedDocument as HTMLHtmlElement
    expect(documentElement.lang).toBe('ko')
    expect(documentElement.dir).toBe('rtl')
    expect(documentElement.classList.contains('dark')).toBe(true)
    expect(documentElement.querySelector('meta[name="theme-color"]')).toBeNull()
    expect(documentElement.querySelector('script')).not.toBeNull()
    expect(readChildren).toHaveBeenCalledOnce()
    expect(readScripts).toHaveBeenCalledOnce()
    expect(insertedValues).toEqual(expect.arrayContaining(['children-slot', 'script-slot']))
  })

  it('should render the light fallback document for the Apps in Toss target', async () => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')

    await import('../entry-server')
    executeRegisteredHandler()

    expect(renderedDocument?.classList.contains('dark')).toBe(false)
    expect(renderedDocument?.querySelector('meta[name="theme-color"]')).toBeNull()
    expect(renderedDocument?.querySelector('script')).not.toBeNull()
    expect(readChildren).toHaveBeenCalledOnce()
    expect(readScripts).toHaveBeenCalledOnce()
    expect(insertedValues).toEqual(expect.arrayContaining(['children-slot', 'script-slot']))
  })
})
