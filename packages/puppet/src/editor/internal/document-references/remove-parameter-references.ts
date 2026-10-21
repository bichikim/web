import {getTimelineRowIds, withTimelineRowIds} from '../../../player/motion-timeline-rows'
import {removeMouthShapeParameters} from '../mouth-shapes'
import type {PuppetDocument, PuppetPhysics} from '../../../player/document'

/** Drops removed parameters from the eye-blink and lip-sync roles, omitting empty roles. */
const removeRoleParameters = (document: PuppetDocument, kept: (id: string) => boolean) => {
  const listed = (ids?: ReadonlyArray<string>) => {
    const remaining = ids?.filter(kept) ?? []
    return remaining.length === 0 ? undefined : remaining
  }
  const roles = {
    eyeBlink: listed(document.parameterRoles?.eyeBlink),
    lipSync: listed(document.parameterRoles?.lipSync),
  }
  const {parameterRoles: _roles, ...rest} = document
  return roles.eyeBlink === undefined && roles.lipSync === undefined
    ? rest
    : {...rest, parameterRoles: roles}
}

/** Breath and look entries of kept parameters; lists left empty are omitted. */
const keepEffectParameters = (document: PuppetDocument, kept: (id: string) => boolean) => {
  const listed = <T extends {readonly parameterId: string}>(entries?: ReadonlyArray<T>) => {
    const remaining = entries?.filter((entry) => kept(entry.parameterId))
    return remaining?.length === 0 ? undefined : remaining
  }
  return {breath: listed(document.breath), look: listed(document.look)}
}

/** Whether `physics` holds neither pendulums, chains nor world settings. */
const isEmptyPhysics = (physics: PuppetPhysics) =>
  physics.pendulums.length === 0 &&
  (physics.chains?.length ?? 0) === 0 &&
  physics.fps === undefined &&
  physics.gravity === undefined &&
  physics.wind === undefined

/** Drops document references to `removedParameterIds` outside parameter bindings. */
export const removeParameterReferences = (
  document: PuppetDocument,
  removedParameterIds: ReadonlySet<string>,
): PuppetDocument => {
  const kept = (id: string) => !removedParameterIds.has(id)
  const physics =
    document.physics === undefined
      ? undefined
      : {
          ...document.physics,
          // Chains stay; only their inputs and outputs of removed parameters go.
          chains: document.physics.chains?.map((chain) => ({
            ...chain,
            inputs: chain.inputs.filter((input) => kept(input.parameterId)),
            outputs: chain.outputs.filter((output) => kept(output.parameterId)),
          })),
          pendulums: document.physics.pendulums.filter(
            (pendulum) => kept(pendulum.inputParameterId) && kept(pendulum.outputParameterId),
          ),
        }
  const roles = document.parameterRoles
  const withoutRoles = roles === undefined ? document : removeRoleParameters(document, kept)
  return {
    ...removeMouthShapeParameters(withoutRoles, removedParameterIds),
    ...keepEffectParameters(document, kept),
    expressions: document.expressions?.map((expression) => ({
      ...expression,
      parameters: expression.parameters.filter((parameter) => kept(parameter.parameterId)),
    })),
    layerOrderRules: document.layerOrderRules?.filter((rule) => rule.when.parameterIds.every(kept)),
    motions: document.motions.map((motion) => ({
      ...withTimelineRowIds(document, motion, getTimelineRowIds(document, motion).filter(kept)),
      tracks: motion.tracks.filter(
        (track) => track.kind !== 'parameter' || kept(track.parameterId),
      ),
    })),
    // World settings (fps, gravity, wind) apply only to chains; they outlive the last chain so
    // chains added later still use them.
    physics: physics === undefined || isEmptyPhysics(physics) ? undefined : physics,
    poseGroups: document.poseGroups?.filter((group) => kept(group.parameterId)),
  }
}
