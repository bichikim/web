/** Poffo wire tags; numeric array references require container v2. Existing assignments stay fixed. */
export const VALUE_TAG = {
  array: 9,
  asset: 10,
  escaped: 12,
  false: 1,
  float32: 8,
  float64: 6,
  int32: 15,
  null: 0,
  number: 5,
  numberReference: 16,
  object: 11,
  reference: 4,
  string: 3,
  true: 2,
  uint8: 13,
  uint16: 14,
  uint32: 7,
} as const

export const MAX_VALUE_DEPTH = 256
