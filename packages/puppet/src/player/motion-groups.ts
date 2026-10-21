import type {PuppetDocument} from './document'
import type {RandomSource} from './random'

/** A random motion of `group`, or `undefined` when the group has none. */
export const pickGroupMotion = (document: PuppetDocument, group: string, random: RandomSource) => {
  const motions = document.motions.filter((motion) => motion.group === group)
  return motions[Math.min(motions.length - 1, Math.floor(random() * motions.length))]
}
