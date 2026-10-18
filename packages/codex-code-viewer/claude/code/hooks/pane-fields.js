export const fields = {
  endColumn: '',
  endLine: '',
  entryName: '',
  entryPath: '',
  findQuery: '',
  folder: '',
  query: '',
  startColumn: '',
}
/** Updates a recognized transient input without changing the document or attachments. */
export function changeField(command) {
  if (!(command.name in fields)) {
    throw new Error('Unknown Pane field')
  }
  fields[command.name] = command.value
}
