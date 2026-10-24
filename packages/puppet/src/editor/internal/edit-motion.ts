import type {PuppetDocument, PuppetMotion} from '../../player'

type MotionEdit =
  | {readonly type: 'add'}
  | {readonly motionId: string; readonly type: 'delete'}
  | {readonly motionId: string; readonly type: 'duplicate'}
  | {readonly motionId: string; readonly name: string; readonly type: 'rename'}

interface EditMotionOptions {
  readonly document: PuppetDocument
  readonly edit: MotionEdit
}

interface MotionEditResult {
  readonly document: PuppetDocument
  readonly selectedMotionId: string | null
}

const getUniqueMotionId = (motions: ReadonlyArray<PuppetMotion>, requestedId: string) => {
  const motionIds = new Set(motions.map((motion) => motion.id))

  if (!motionIds.has(requestedId)) {
    return requestedId
  }

  let suffix = 2
  while (motionIds.has(`${requestedId}-${suffix}`)) {
    suffix += 1
  }
  return `${requestedId}-${suffix}`
}

const cloneMotion = (motion: PuppetMotion, id: string): PuppetMotion => ({
  ...motion,
  id,
  tracks: motion.tracks.map((track) => ({
    ...track,
    keyframes: track.keyframes.map((keyframe) => ({...keyframe})),
  })),
})

export const editMotion = (options: EditMotionOptions): MotionEditResult | undefined => {
  const {document, edit} = options

  switch (edit.type) {
    case 'add': {
      const id = getUniqueMotionId(document.motions, 'motion')
      return {
        document: {...document, motions: [...document.motions, {duration: 1, id, tracks: []}]},
        selectedMotionId: id,
      }
    }
    case 'delete': {
      const motionIndex = document.motions.findIndex((motion) => motion.id === edit.motionId)
      if (motionIndex === -1) {
        return undefined
      }
      const motions = document.motions.filter((motion) => motion.id !== edit.motionId)
      return {
        document: {...document, motions},
        selectedMotionId: motions[motionIndex]?.id ?? motions.at(-1)?.id ?? null,
      }
    }
    case 'duplicate': {
      const motionIndex = document.motions.findIndex((motion) => motion.id === edit.motionId)
      const motion = document.motions[motionIndex]
      if (motion === undefined) {
        return undefined
      }
      const id = getUniqueMotionId(document.motions, `${motion.id}-copy`)
      const motions = document.motions.toSpliced(motionIndex + 1, 0, cloneMotion(motion, id))
      return {document: {...document, motions}, selectedMotionId: id}
    }
    case 'rename': {
      const id = edit.name.trim()
      const motion = document.motions.find((motion) => motion.id === edit.motionId)
      if (
        motion === undefined ||
        id.length === 0 ||
        id === motion.id ||
        document.motions.some((candidate) => candidate.id === id && candidate !== motion)
      ) {
        return undefined
      }
      return {
        document: {
          ...document,
          motions: document.motions.map((candidate) =>
            candidate === motion ? {...candidate, id} : candidate,
          ),
        },
        selectedMotionId: id,
      }
    }
  }
}
