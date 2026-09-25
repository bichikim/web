import {render} from 'solid-js/web'

import {PuppetEditor} from './editor'
import {createEmptyDocument, parseDocument, type PuppetDocument} from './player'

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

const rootElement = document.querySelector('#root')

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('Puppet root element was not found')
}

if (import.meta.env.DEV && /^\/converter\/?$/u.test(location.pathname)) {
  const {ConverterPage} = await import('./converter/ConverterPage')
  render(() => <ConverterPage />, rootElement)
} else {
  const initialDocument = await loadInitialDocument()
  render(
    () => (
      <PuppetEditor
        initialDocument={initialDocument}
        initialMotionId={import.meta.env.DEV ? DEVELOPMENT_INITIAL_MOTION_ID : undefined}
        initialWorkspace={import.meta.env.DEV ? 'animation' : 'modeling'}
      />
    ),
    rootElement,
  )
}
