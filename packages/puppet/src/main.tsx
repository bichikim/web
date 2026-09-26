import {render} from 'solid-js/web'

import {PuppetEditor} from './editor'
import type {PuppetExampleDocument} from './editor/example-document'
import {createDemoDocument, serializeDocument} from './player'

const DEVELOPMENT_EXAMPLE_URL = '/examples/development-model.json'
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
  () => <PuppetEditor examples={import.meta.env.DEV ? DEVELOPMENT_EXAMPLES : undefined} />,
  rootElement,
)
