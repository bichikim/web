/** 전달받은 레코드를 변경하지 않고 자체 항목을 설정하거나, 값이 null이면 항목을 제거한다. */
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
