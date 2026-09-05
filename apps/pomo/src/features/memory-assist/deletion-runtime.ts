import {deleteDialogueAudio} from '../focus-room-dialogue'
import {createMemoryMemoDeletion} from './deletion'
import {readMemoryMemos, updateMemoryMemos} from './repository'

/** Application-scoped deletion controller shared by memo actions and background recovery. */
export const memoryMemoDeletion = createMemoryMemoDeletion({
  deleteAudio: (audioKey) => deleteDialogueAudio(audioKey, {failureMode: 'throw'}),
  read: readMemoryMemos,
  reportError: (error) => {
    console.error('Memory memo deletion is committed; resource cleanup will retry.', error)
  },
  update: updateMemoryMemos,
})
