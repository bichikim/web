/**
 * HOF: Extract message field from supporter item
 */
export const withMessageField =
  (field: string) =>
  (item: unknown): string | undefined =>
    (item as Record<string, unknown>)[field] as string | undefined

/**
 * Extract support_note or message from BMC supporter item
 */
const supportNoteField = withMessageField('support_note')
const messageField = withMessageField('message')

/**
 * Get displayable message from supporter item (tries support_note first, then message)
 */
export const getSupporterMessage = (item: unknown): string | undefined => supportNoteField(item) ?? messageField(item)

/**
 * Filter items that have a non-empty message
 */
export const filterWithMessage = (items: unknown[]): string[] =>
  items
    .map(getSupporterMessage)
    .filter((message): message is string => typeof message === 'string' && message.trim().length > 0)
