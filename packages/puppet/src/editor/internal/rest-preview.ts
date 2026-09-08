import type {PuppetDocument} from '../../player/document'
import {getScenePartStates} from '../../player/scene'

/** Displays undeformed meshes without changing the stored rig. */
export const getRestPreview = (document: PuppetDocument): PuppetDocument => ({
  ...document,
  glue: [],
  motions: [],
  parameterBindings: [],
  parameters: [],
  scene: {
    roots: getScenePartStates(document).map((state) => ({
      id: state.partId,
      kind: 'part',
      name: state.partId,
      locked: state.locked,
      visible: state.visible,
    })),
  },
})
