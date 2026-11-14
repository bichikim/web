import type {PuppetDocument} from './document'
import {normalizeMesh} from '../mesh/normalize'
import {getDocumentScene} from './scene'
import {compactDocumentTextures} from './texture-assets'

/** Normalizes export geometry and scene references without modifying the source document. */
export const getExportDocument = (document: PuppetDocument) =>
  compactDocumentTextures({
    ...document,
    parts: document.parts.map((part) => ({...part, mesh: normalizeMesh(part.mesh)})),
    scene: getDocumentScene(document),
  })
