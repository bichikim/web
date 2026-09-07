import type {PuppetDocument} from './document'
import {normalizeMesh} from '../mesh/normalize'
import {getDocumentScene} from './scene'

export const serializeDocument = (document: PuppetDocument) =>
  JSON.stringify(
    {
      ...document,
      parts: document.parts.map((part) => ({...part, mesh: normalizeMesh(part.mesh)})),
      scene: getDocumentScene(document),
    },
    null,
    2,
  )
