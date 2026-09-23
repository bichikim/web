import {PUPPET_DOCUMENT_FORMAT, PUPPET_DOCUMENT_VERSION, type PuppetDocument} from './document'

const EMPTY_VIEWPORT_WIDTH = 640
const EMPTY_VIEWPORT_HEIGHT = 480

export const createEmptyDocument = (): PuppetDocument => ({
  format: PUPPET_DOCUMENT_FORMAT,
  motions: [],
  parameterBindings: [],
  parameters: [],
  parts: [],
  scene: {roots: []},
  version: PUPPET_DOCUMENT_VERSION,
  viewport: {height: EMPTY_VIEWPORT_HEIGHT, width: EMPTY_VIEWPORT_WIDTH},
})
