import type {Player} from '../../player'
import {resumeEditorAudio} from './editor-audio'

const setPlayerPlayback = (player: Player, isPlaying: boolean) => {
  if (isPlaying) {
    resumeEditorAudio()
    player.play()
    return
  }
  player.pause()
}
export const togglePlayerPlayback = (player: Player, isPlaying: boolean) => {
  const nextIsPlaying = !isPlaying
  setPlayerPlayback(player, nextIsPlaying)
  return nextIsPlaying
}
export const syncPlayerPlayback = (player: Player | null, isPlaying: boolean) => {
  if (player !== null) {
    if (isPlaying) {
      player.resume()
    } else {
      player.pause()
    }
  }
  return player
}
