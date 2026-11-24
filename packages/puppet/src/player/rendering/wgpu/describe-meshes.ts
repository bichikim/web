import type {PuppetDocument} from '../../document'
import {getPartRenderFrame} from '../../internal/render-plan'

export const describeMeshes = (document: PuppetDocument, sources: readonly string[]): string =>
  JSON.stringify({
    parts: document.parts.map((part) => ({
      id: part.id,
      indices: part.mesh.indices,
      texture: sources.indexOf(part.texture.src),
      uvs: part.mesh.uvs,
      vertices: part.mesh.vertices,
    })),
    plans: getPartRenderFrame(document).plans,
    viewport: document.viewport,
  })
