import {z} from 'zod'

export const treeStateSchema = z.object({
  expanded: z.array(z.string()).optional(),
  visible: z.boolean().optional(),
})
export type TreeState = z.infer<typeof treeStateSchema>
