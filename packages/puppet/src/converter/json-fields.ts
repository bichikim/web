import {isRecord} from '../player/internal/parse-primitives'

export const jsonObject = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new Error('Cubism JSON object is missing or invalid')
  }
  return value
}

export const jsonArray = (value: unknown): ReadonlyArray<unknown> => {
  if (!Array.isArray(value)) {
    throw new Error('Cubism JSON array is missing or invalid')
  }
  return value
}

export const jsonNumber = (value: unknown, fallback?: number): number => {
  if (value === undefined && fallback !== undefined) {
    return fallback
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Cubism JSON number is missing or invalid')
  }
  return value
}

export const jsonString = (value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Cubism JSON string is missing or invalid')
  }
  return value
}

export const jsonBoolean = (value: unknown, fallback = false): boolean => {
  if (value === undefined) {
    return fallback
  }
  if (typeof value !== 'boolean') {
    throw new Error('Cubism JSON boolean is invalid')
  }
  return value
}
