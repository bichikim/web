import {
  MAXIMUM_PUPPET_FRAMES_PER_SECOND,
  MINIMUM_PUPPET_FRAMES_PER_SECOND,
  type PuppetDocument,
} from '../../player'

const isFramesPerSecond = (value: number) =>
  Number.isInteger(value) &&
  value >= MINIMUM_PUPPET_FRAMES_PER_SECOND &&
  value <= MAXIMUM_PUPPET_FRAMES_PER_SECOND

/**
 * Sets the frame rate of the motion `motionId` (Cubism keeps one per motion), or the document's
 * default for motions without their own when no motion is given.
 */
export const setFramesPerSecond = (
  document: PuppetDocument,
  motionId: string | undefined,
  framesPerSecond: number,
): PuppetDocument | undefined => {
  if (!isFramesPerSecond(framesPerSecond)) {
    return undefined
  }
  if (motionId === undefined) {
    return {...document, framesPerSecond}
  }
  return document.motions.some((motion) => motion.id === motionId)
    ? {
        ...document,
        motions: document.motions.map((motion) =>
          motion.id === motionId ? {...motion, framesPerSecond} : motion,
        ),
      }
    : undefined
}
