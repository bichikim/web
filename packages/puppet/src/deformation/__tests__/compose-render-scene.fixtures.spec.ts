import {expect, test} from 'vitest'
import connectedCurve from '../../../examples/connected-curve.json'
import curvedStrand from '../../../examples/strand-curve.json'
import strand from '../../../examples/strand.json'
import skinning from '../../../examples/rotation-skinning.json'
import {parseDocument} from '../../player/parse-document'
import {composeRenderScene} from '../compose-render-scene'
import {composeParameterScene} from '../scene'
import {applySceneNodeDeformers} from '../vertices'

for (const [name, source] of [
  ['connected curve', connectedCurve],
  ['curved strand', curvedStrand],
  ['strand', strand],
  ['skinning', skinning],
] as const) {
  test.each(['defaultValue', 'minimum', 'maximum'] as const)(
    `should preserve ${name} deformations at %s parameters`,
    (key) => {
      const result = parseDocument(JSON.stringify(source))
      expect(result.ok).toBe(true)
      if (!result.ok) {
        throw new Error('Expected a valid fixture')
      }
      const document = result.document
      const values = Object.fromEntries(
        (document.parameters ?? []).map((parameter) => [parameter.id, parameter[key]]),
      )
      const eager = new Map(
        document.parts.map((part) => [part.id, new Float32Array(part.mesh.vertices)]),
      )
      const deferred = new Map(
        document.parts.map((part) => [part.id, new Float32Array(part.mesh.vertices)]),
      )
      applySceneNodeDeformers(composeParameterScene(document, values).roots, eager)
      applySceneNodeDeformers(composeRenderScene(document, values).roots, deferred, {
        deferCoordinates: true,
      })
      expect(deferred).toEqual(eager)
    },
  )
}
