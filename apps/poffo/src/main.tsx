import {ConnectedWorkspace} from './backend/browser/ConnectedWorkspace'
import 'virtual:uno.css'
import {render} from 'solid-js/web'
import {connectDesktopBackend} from './desktop/connect-backend'
import {initializeDesktopMenu} from './desktop/menu'

import {WorkspaceApp} from './WorkspaceApp'
import {restoreColorTheme} from './color-theme/color-theme'
import type {PuppetExampleDocument} from '@winter-love/puppet/editor'
import {
  createDemoDocument,
  createEmptyDocument,
  parseDocument,
  type PuppetDocument,
  serializeDocument,
} from '@winter-love/puppet/player'

const DEVELOPMENT_EXAMPLE_URL = '/examples/development-model.json'
const DEVELOPMENT_INITIAL_MOTION_ID = 'idle'

const loadInitialDocument = async (): Promise<PuppetDocument> => {
  if (!import.meta.env.DEV) {
    return createEmptyDocument()
  }

  const response = await fetch(DEVELOPMENT_EXAMPLE_URL)

  if (!response.ok) {
    throw new Error(`Development example could not be loaded: ${response.status}`)
  }

  const result = parseDocument(await response.text())

  if (!result.ok) {
    throw new Error('Development example is not a valid Puppet document')
  }

  return result.document
}

const DEVELOPMENT_EXAMPLES: ReadonlyArray<PuppetExampleDocument> = [
  {
    label: '캐릭터',
    load: async (signal) => {
      const response = await fetch(DEVELOPMENT_EXAMPLE_URL, {signal})
      if (!response.ok) {
        throw new Error(`Development example could not be loaded: ${response.status}`)
      }
      return new File([await response.blob()], '캐릭터.json', {type: 'application/json'})
    },
  },
  {
    label: '단순 3개 파츠',
    load: async () =>
      new File([serializeDocument(createDemoDocument())], '단순 3개 파츠.json', {
        type: 'application/json',
      }),
  },
]

const rootElement = document.querySelector('#root')

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('Puppet root element was not found')
}

restoreColorTheme(document.documentElement)

const connectionKey = 'poffo:backend-token:v1'
const fragment = new URLSearchParams(location.hash.slice(1))
const receivedToken = fragment.get('poffo-token')
if (receivedToken !== null) {
  sessionStorage.setItem(connectionKey, receivedToken)
  history.replaceState(history.state, '', location.pathname + location.search)
}
const backendToken = receivedToken ?? sessionStorage.getItem(connectionKey)

const startApplication = (
  connection: {readonly url: string; readonly token: string} | null = null,
) =>
  render(
    () =>
      backendToken === null && connection === null ? (
        <WorkspaceApp
          examples={import.meta.env.DEV ? DEVELOPMENT_EXAMPLES : undefined}
          loadInitialDocument={loadInitialDocument}
          initialMotionId={import.meta.env.DEV ? DEVELOPMENT_INITIAL_MOTION_ID : undefined}
          initialWorkspace={import.meta.env.DEV ? 'animation' : 'modeling'}
        />
      ) : (
        <ConnectedWorkspace
          url={connection?.url ?? location.origin}
          token={connection?.token ?? backendToken!}
        />
      ),
    rootElement,
  )

const initialize = async () => {
  await initializeDesktopMenu(import.meta.env.DEV ? DEVELOPMENT_EXAMPLES : [])
  const attachment = await connectDesktopBackend()
  startApplication(attachment?.connection ?? null)
}

initialize().catch((cause: unknown) => {
  console.error('Poffo initialization failed.', cause)
  if (rootElement !== null) {
    rootElement.textContent = 'Poffo를 시작하지 못했습니다. 앱을 다시 실행하세요.'
  }
})
