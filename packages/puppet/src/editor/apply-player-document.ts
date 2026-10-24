import type {Player, PuppetDocument} from '../player'
import type {PuppetParameterValueMap} from '../deformation'
import {markPreparedPuppetDocument} from '../player/internal/prepared-document'
interface PlayerDocumentOptions {
  /** Overrides applied atomically with the document. Omitted, use document defaults. */
  readonly parameterValues?: PuppetParameterValueMap
  /** Requested motion. Omitted, leave playback selection to the caller. */
  readonly motionId?: string
  /** Recorded time for the selected motion. Omitted, retain normal document-change behavior. */
  readonly resumeTime?: number
}
/** Updates a compatible renderer and optionally restores the active motion's position. */
export const applyPlayerDocument = (
  player: Player,
  document: PuppetDocument,
  options: PlayerDocumentOptions,
  previous?: PuppetDocument,
) => {
  if (!player.updateDocument(markPreparedPuppetDocument(document), options.parameterValues ?? {})) {
    return false
  }
  const time = options.resumeTime
  const motion = options.motionId
  if (motion === undefined || (time === undefined && previous?.motions === document.motions)) {
    return true
  }
  const selected = player.setMotion(motion)
  if (selected && time !== undefined) {
    player.seek(time)
  }
  return true
}
