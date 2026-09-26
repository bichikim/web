/** Sets an own entry or removes it for null without mutating the supplied record. */
export const setOptionalRecordEntry = <Key extends PropertyKey, Value>(
  record: Readonly<Partial<Record<Key, Value>>>,
  key: Key,
  value: Value | null,
): Partial<Record<Key, Value>> => {
  if (value !== null) {
    return {...record, [key]: value}
  }
  const next = {...record}
  delete next[key]
  return next
}
