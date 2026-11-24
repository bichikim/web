import {DEFAULT_TOUCH_JOINT_RESPONSE, type PoffoTouch, type TouchJointChain} from './touch'

/** Converts earlier arm settings without losing their joint choices, weights or disabled state. */
export const touchJointChains = (settings: PoffoTouch | undefined): readonly TouchJointChain[] =>
  (settings?.chains ?? []).map((chain, index) => {
    if ('joints' in chain) {
      return settings?.inverseKinematics === false ? {...chain, enabled: false} : chain
    }
    const named = 'id' in chain
    const id = named ? chain.id : `legacy-${index + 1}`
    const parameters = named
      ? [chain.parameters.shoulder, chain.parameters.elbow, chain.parameters.wrist]
      : chain
    const response =
      (named ? chain.response : undefined) ??
      settings?.jointResponse ??
      DEFAULT_TOUCH_JOINT_RESPONSE
    const weights = [response.shoulder, response.elbow, response.wrist]
    const enabled = named
      ? chain.enabled
      : chain.every(
          (parameterId) =>
            Object.hasOwn(settings?.parameters ?? {}, parameterId) &&
            settings?.parameters?.[parameterId]?.axis !== 'off',
        )
    return {
      enabled: settings?.inverseKinematics !== false && enabled,
      id,
      joints: parameters.map((parameterId, position) => ({
        id: `${id}-${position}`,
        parameterId,
        response: weights[position]!,
      })),
      name: named ? chain.name : `연결 ${index + 1}`,
      preserveAngle: true,
    }
  })
