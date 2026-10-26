import 'virtual:uno.css'
import {render} from 'solid-js/web'

import {WorkspaceApp} from './WorkspaceApp'
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

render(
  () => (
    <WorkspaceApp
      examples={import.meta.env.DEV ? DEVELOPMENT_EXAMPLES : undefined}
      loadInitialDocument={loadInitialDocument}
      initialMotionId={import.meta.env.DEV ? DEVELOPMENT_INITIAL_MOTION_ID : undefined}
      initialWorkspace={import.meta.env.DEV ? 'animation' : 'modeling'}
    />
  ),
  rootElement,
)
