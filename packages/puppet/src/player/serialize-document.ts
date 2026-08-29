import type {PuppetDocument} from './document'
import {normalizeMesh} from '../mesh/normalize'

export const serializeDocument = (document: PuppetDocument) =>
  JSON.stringify(
    {
      ...document,
      parts: document.parts.map((part) => ({...part, mesh: normalizeMesh(part.mesh)})),
    },
    null,
    2,
  )
