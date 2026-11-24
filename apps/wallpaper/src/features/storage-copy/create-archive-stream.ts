import type {JsonStream} from 'dexie-export-import/dist/json-stream'
import type {DexieExportJsonStructure} from 'dexie-export-import/dist/json-structure'
const validArchive = (value: unknown): value is DexieExportJsonStructure => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('formatName' in value) ||
    value.formatName !== 'dexie' ||
    !('formatVersion' in value) ||
    value.formatVersion !== 1 ||
    !('data' in value)
  ) {
    return false
  }
  const {data} = value
  if (
    typeof data !== 'object' ||
    data === null ||
    !('databaseName' in data) ||
    typeof data.databaseName !== 'string' ||
    !('databaseVersion' in data) ||
    typeof data.databaseVersion !== 'number' ||
    !('tables' in data) ||
    !Array.isArray(data.tables) ||
    !('data' in data) ||
    !Array.isArray(data.data)
  ) {
    return false
  }
  return (
    data.tables.every(
      (table: unknown) =>
        typeof table === 'object' &&
        table !== null &&
        'name' in table &&
        typeof table.name === 'string' &&
        'schema' in table &&
        typeof table.schema === 'string' &&
        'rowCount' in table &&
        typeof table.rowCount === 'number',
    ) &&
    data.data.every(
      (table: unknown) =>
        typeof table === 'object' &&
        table !== null &&
        'tableName' in table &&
        typeof table.tableName === 'string' &&
        'inbound' in table &&
        typeof table.inbound === 'boolean' &&
        'rows' in table &&
        Array.isArray(table.rows),
    )
  )
}
/** Supplies one validated native-JSON parse; authored strings may exceed the streaming parser's 10MB token limit. */
export const createArchiveStream = async (
  blob: Blob,
): Promise<JsonStream<DexieExportJsonStructure>> => {
  const result: unknown = JSON.parse(await blob.text())
  if (!validArchive(result)) {
    throw new Error('Invalid storage archive')
  }
  return {
    done: () => true,
    eof: () => true,
    pullAsync: async () => result,
    pullSync: () => result,
    result,
  }
}
