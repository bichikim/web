import {type PoffoTouch, poffoTouchSchema} from './touch'
import {touchJointChains} from './touch-joint-chains'
import {type RandomActionSettings, randomActionSettingsSchema} from './random-actions'
import {z} from 'zod'
import {type AgentStateBindings, agentStateBindingsSchema} from './agent-state'
import {type PoffoLipSync, poffoLipSyncSchema} from './lipsync'
import {type SemanticAction, type SemanticBinding, semanticBindingsSchema} from './semantics'
import {semanticTargets} from './semantic-targets'
import {
  poffoBindingsSchema,
  type PoffoTracking,
  type PoffoTrackingBindings,
  type PoffoTrackingOptions,
  poffoTrackingOptionsSchema,
  type PoffoTrackingProfiles,
  poffoTrackingProfilesSchema,
  poffoTrackingSchema,
} from './tracking'

export const MAX_CONNECTION_BYTES = 262_144

export interface PoffoConnections {
  readonly touch?: PoffoTouch
  /** Applied builtin touch-default revision; omission retains the current revision. */
  readonly touchBindingsVersion?: number
  readonly randomActions?: RandomActionSettings
  /** Tracking input mode; omitted in older profiles leaves the current mode unchanged. */
  readonly tracking?: PoffoTracking
  readonly trackingBindings?: PoffoTrackingBindings
  /** Applied builtin tracking-default revision; omission retains the current revision. */
  readonly trackingBindingsVersion?: number
  readonly trackingOptions?: PoffoTrackingOptions
  /** Input-specific gaze calibration and connections; omission retains shared legacy fields. */
  readonly trackingProfiles?: PoffoTrackingProfiles
  readonly lipsync?: PoffoLipSync
  readonly semanticBindings?: readonly SemanticBinding[]
  /** Applied builtin action-default revision; omitted leaves the current revision unchanged. */
  readonly semanticBindingsVersion?: number
  readonly agentBindings?: AgentStateBindings
  /** Applied builtin state-default revision; omission retains the widget's current revision. */
  readonly agentBindingsVersion?: number
}
export const poffoConnectionsSchema: z.ZodType<PoffoConnections> = z.object({
  agentBindings: agentStateBindingsSchema.optional(),
  agentBindingsVersion: z.number().int().positive().optional(),
  lipsync: poffoLipSyncSchema.optional(),
  randomActions: randomActionSettingsSchema.optional(),
  semanticBindings: semanticBindingsSchema.optional(),
  semanticBindingsVersion: z.number().int().positive().optional(),
  touch: poffoTouchSchema.optional(),
  touchBindingsVersion: z.number().int().positive().optional(),
  tracking: poffoTrackingSchema.optional(),
  trackingBindings: poffoBindingsSchema.optional(),
  trackingBindingsVersion: z.number().int().positive().optional(),
  trackingOptions: poffoTrackingOptionsSchema.optional(),
  trackingProfiles: poffoTrackingProfilesSchema.optional(),
})
export interface ConnectionProfile {
  readonly assetId: string
  readonly connections: PoffoConnections
  readonly format: 'poffo-connections'
  readonly version: 1
}
export const connectionProfileSchema: z.ZodType<ConnectionProfile> = z.object({
  assetId: z.string().min(1),
  connections: poffoConnectionsSchema,
  format: z.literal('poffo-connections'),
  version: z.literal(1),
})
interface ParseConnectionProfileOptions {
  readonly assetId: string
  readonly parameters: readonly {readonly id: string}[]
  /** Available character actions; omitted skips action availability checks. */
  readonly actions?: readonly SemanticAction[]
}
export type ConnectionProfileResult =
  | {readonly ok: true; readonly profile: ConnectionProfile}
  | {readonly ok: false; readonly reason: 'invalid' | 'character' | 'parameter' | 'action'}

const parameterBindings = (connections: PoffoConnections) => [
  ...touchJointChains(connections.touch).flatMap((chain) => chain.joints),
  ...Object.values(connections.trackingBindings ?? {}),
  ...Object.values(connections.trackingProfiles ?? {}).flatMap((profile) =>
    Object.values(profile?.bindings ?? {}),
  ),
  connections.lipsync,
  ...Object.values(connections.lipsync?.shapes ?? {}),
  ...(connections.semanticBindings ?? []),
  ...Object.values(connections.agentBindings ?? {}),
]

export const parseConnectionProfile = (
  source: string,
  options: ParseConnectionProfileOptions,
): ConnectionProfileResult => {
  if (
    source.length > MAX_CONNECTION_BYTES ||
    new TextEncoder().encode(source).byteLength > MAX_CONNECTION_BYTES
  ) {
    return {ok: false, reason: 'invalid'}
  }
  let input: unknown
  try {
    input = JSON.parse(source)
  } catch {
    return {ok: false, reason: 'invalid'}
  }
  const parsed = connectionProfileSchema.safeParse(input)
  if (!parsed.success) {
    return {ok: false, reason: 'invalid'}
  }
  const profile = parsed.data
  if (profile.assetId.startsWith('builtin:') && profile.assetId !== options.assetId) {
    return {ok: false, reason: 'character'}
  }
  const {connections} = profile
  const {actions} = options
  if (
    actions !== undefined &&
    [
      ...(connections.semanticBindings ?? []).flatMap(semanticTargets),
      ...Object.values(connections.agentBindings ?? {}).flatMap(
        (binding) => binding?.actions ?? [],
      ),
    ].some((action) => !actions.some((item) => item.kind === action.kind && item.id === action.id))
  ) {
    return {ok: false, reason: 'action'}
  }
  const bindings = parameterBindings(connections)
  const missing = bindings.some((binding) => {
    const id = binding?.parameterId
    return typeof id === 'string' && !options.parameters.some((parameter) => parameter.id === id)
  })
  const missingTouch = Object.keys(connections.touch?.parameters ?? {}).some(
    (id) => !options.parameters.some((parameter) => parameter.id === id),
  )
  return missing || missingTouch ? {ok: false, reason: 'parameter'} : {ok: true, profile}
}
