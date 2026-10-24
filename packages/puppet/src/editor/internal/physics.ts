import type {PuppetDocument, PuppetPendulum} from '../../player/document'
import {hasValidPhysics} from '../../player/internal/parse-physics'

const DEFAULT_DAMPING = 1.2
const DEFAULT_GRAVITY = 9.8
const DEFAULT_INPUT_SCALE = 1
const DEFAULT_LENGTH = 1
const DEFAULT_OUTPUT_SCALE = 1

interface AddPhysicsPendulumOperation {
  readonly inputParameterId?: string
  readonly kind: 'add'
}

interface RemovePhysicsPendulumOperation {
  readonly kind: 'remove'
  readonly pendulumId: string
}

interface UpdatePhysicsPendulumOperation {
  readonly changes: Partial<Omit<PuppetPendulum, 'id'>>
  readonly kind: 'update'
  readonly pendulumId: string
}

export type PhysicsParameterProperty = 'inputParameterId' | 'outputParameterId'
export type PhysicsNumberProperty = 'damping' | 'gravity' | 'inputScale' | 'length' | 'outputScale'

export type PhysicsOperation =
  | AddPhysicsPendulumOperation
  | RemovePhysicsPendulumOperation
  | UpdatePhysicsPendulumOperation

export interface UpdatePhysicsOptions {
  readonly document: PuppetDocument
  readonly operation: PhysicsOperation
}

const getPendulums = (document: PuppetDocument) => document.physics?.pendulums ?? []

const createPendulumId = (pendulums: ReadonlyArray<PuppetPendulum>) => {
  const ids = new Set(pendulums.map((pendulum) => pendulum.id))
  let index = 1
  let id = `pendulum-${index}`

  while (ids.has(id)) {
    index += 1
    id = `pendulum-${index}`
  }

  return id
}

const createDefaultPendulum = (
  document: PuppetDocument,
  pendulums: ReadonlyArray<PuppetPendulum>,
  requestedInputParameterId?: string,
): PuppetPendulum | undefined => {
  const parameters = document.parameters ?? []
  const outputParameterIds = new Set(pendulums.map((pendulum) => pendulum.outputParameterId))
  const inputParameter =
    parameters.find((parameter) => parameter.id === requestedInputParameterId) ?? parameters[0]
  const outputParameter = parameters.find(
    (parameter) => parameter.id !== inputParameter?.id && !outputParameterIds.has(parameter.id),
  )

  return outputParameter === undefined || inputParameter === undefined
    ? undefined
    : {
        damping: DEFAULT_DAMPING,
        gravity: DEFAULT_GRAVITY,
        id: createPendulumId(pendulums),
        inputParameterId: inputParameter.id,
        inputScale: DEFAULT_INPUT_SCALE,
        length: DEFAULT_LENGTH,
        outputParameterId: outputParameter.id,
        outputScale: DEFAULT_OUTPUT_SCALE,
      }
}

const createPhysicsDocument = (
  document: PuppetDocument,
  pendulums: ReadonlyArray<PuppetPendulum>,
): PuppetDocument | undefined => {
  const nextDocument: PuppetDocument = {
    ...document,
    physics: pendulums.length === 0 ? undefined : {pendulums},
  }

  return hasValidPhysics(nextDocument.physics, nextDocument.parameters ?? [])
    ? nextDocument
    : undefined
}

const addPendulum = (
  document: PuppetDocument,
  inputParameterId?: string,
): PuppetDocument | undefined => {
  const pendulums = getPendulums(document)
  const pendulum = createDefaultPendulum(document, pendulums, inputParameterId)

  return pendulum === undefined
    ? undefined
    : createPhysicsDocument(document, [...pendulums, pendulum])
}

const removePendulum = (
  document: PuppetDocument,
  pendulumId: string,
): PuppetDocument | undefined => {
  const pendulums = getPendulums(document)
  if (!pendulums.some((pendulum) => pendulum.id === pendulumId)) {
    return undefined
  }

  return createPhysicsDocument(
    document,
    pendulums.filter((pendulum) => pendulum.id !== pendulumId),
  )
}

const updatePendulum = (
  document: PuppetDocument,
  operation: UpdatePhysicsPendulumOperation,
): PuppetDocument | undefined => {
  const pendulums = getPendulums(document)
  if (!pendulums.some((pendulum) => pendulum.id === operation.pendulumId)) {
    return undefined
  }

  return createPhysicsDocument(
    document,
    pendulums.map((pendulum) =>
      pendulum.id === operation.pendulumId ? {...pendulum, ...operation.changes} : pendulum,
    ),
  )
}

/** Applies one editor operation to the document-level pendulum settings. */
export const updatePhysics = (options: UpdatePhysicsOptions): PuppetDocument | undefined => {
  switch (options.operation.kind) {
    case 'add':
      return addPendulum(options.document, options.operation.inputParameterId)
    case 'remove':
      return removePendulum(options.document, options.operation.pendulumId)
    case 'update':
      return updatePendulum(options.document, options.operation)
    default: {
      const exhaustiveOperation: never = options.operation
      return exhaustiveOperation
    }
  }
}
