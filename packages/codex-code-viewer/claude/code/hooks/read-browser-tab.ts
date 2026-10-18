import {z} from 'zod'

interface BrowserTab {
  readonly tabId: string
  readonly origin: string
  readonly isActive: boolean
}
const contextSchema = z.object({
  tabs: z.array(z.object({isActive: z.boolean(), origin: z.string(), tabId: z.string()})),
})
const blocksSchema = z.array(z.object({text: z.string(), type: z.literal('text')}))

/** Reads the viewer's tab from Browser context without treating invalid context as a closed tab. */
export const readBrowserTab = (input: unknown, url: string): BrowserTab | undefined => {
  const content = Array.isArray(input)
    ? blocksSchema
        .parse(input)
        .map((block) => block.text)
        .join('\n')
    : input
  const value =
    typeof content === 'string'
      ? JSON.parse(content.split(/\r?\nThe Browser pane /u, 1)[0])
      : content
  const {tabs} = contextSchema.parse(value)
  const {origin} = new URL(url)
  return tabs.find((tab) => tab.origin === origin)
}
