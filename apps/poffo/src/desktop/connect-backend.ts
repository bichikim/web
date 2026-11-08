import {invoke, isTauri} from '@tauri-apps/api/core'
import {z} from 'zod'
import {connectionSchema} from '../backend/protocol'

const attachmentSchema = z.object({
  connection: connectionSchema,
  owned: z.boolean(),
  workspace: z.string(),
})

/** Gets the app-owned connection over IPC; credentials never enter the navigation URL. */
export const connectDesktopBackend = async () => {
  if (!isTauri()) {
    return null
  }
  return attachmentSchema.parse(await invoke('connect_backend'))
}
