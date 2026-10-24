import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocumentValue, type PuppetDocument} from '../../../player'
import {getPartRenderFrame} from '../../../player/internal/render-plan'
import {
  connectParameterGroup,
  disconnectParameterGroup,
  getKeyformGroupProperties,
  setKeyformGroupProperties,
} from '../group-keyforms'
import {insertParameterKeyform} from '../parameter-keyforms'
import {unwrapSceneNode} from '../scene-graph'

const BINDING = 'angle-xy'
const GROUP = 'shapes'

/** The demo with its `shapes` group keyed to fade out toward Angle X 30. */
const createKeyedDocument = () => {
  const connected = connectParameterGroup(createDemoDocument(), BINDING, GROUP)!
  return setKeyformGroupProperties({
    bindingId: BINDING,
    document: connected,
    groupId: GROUP,
    properties: {opacity: 0.2},
    values: [30, 0],
  })!
}

const circleOpacity = (document: PuppetDocument, angleX: number) =>
  getPartRenderFrame(document, {'angle-x': angleX}).plans.find(
    (plan) => plan.partId === 'shape-circle',
  )?.properties.opacity

describe('group keyforms', () => {
  test('should key group opacity on a parameter and pass it to the group members', () => {
    const document = createKeyedDocument()

    expect(parseDocumentValue(document).ok).toBe(true)
    expect(circleOpacity(document, 0)).toBeCloseTo(1)
    expect(circleOpacity(document, 15)).toBeCloseTo(0.6)
    expect(circleOpacity(document, 30)).toBeCloseTo(0.2)
  })

  test('should sample keyed groups into inserted keyforms', () => {
    const document = insertParameterKeyform({
      bindingId: BINDING,
      document: createKeyedDocument(),
      values: [15, 0],
    })!

    expect(getKeyformGroupProperties(document, BINDING, [15, 0], GROUP)?.opacity).toBeCloseTo(0.6)
    expect(parseDocumentValue(document).ok).toBe(true)
  })

  test('should drop group targets on disconnect and when the group is unwrapped', () => {
    const keyed = createKeyedDocument()
    for (const document of [
      disconnectParameterGroup(keyed, BINDING, GROUP)!,
      unwrapSceneNode(keyed, GROUP)!,
    ]) {
      const binding = document.parameterBindings?.find((candidate) => candidate.id === BINDING)
      expect(binding?.targetGroupIds ?? []).toEqual([])
      expect(binding?.keyforms.every((keyform) => (keyform.groups ?? []).length === 0)).toBe(true)
      expect(parseDocumentValue(document).ok).toBe(true)
    }
  })

  test('should reject keyforms missing a target group', () => {
    const keyed = createKeyedDocument()
    const [binding] = keyed.parameterBindings!
    // Deliberately invalid, so not typed as a document.
    const broken = {
      ...keyed,
      parameterBindings: [
        {...binding!, keyforms: binding!.keyforms.map((keyform) => ({...keyform, groups: []}))},
      ],
    }

    expect(parseDocumentValue(broken).ok).toBe(false)
  })
})
