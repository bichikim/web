import {z} from 'zod'

import {WEATHER_CONDITIONS} from '../weather'

export const MAXIMUM_PICTURE_DIARY_TEXT_LENGTH = 2_000
export const MAXIMUM_STROKE_COUNT = 200
export const MAXIMUM_POINT_COUNT = 2_000

const pointSchema = z
  .object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
  })
  .readonly()

const strokeSchema = z
  .object({
    points: z.array(pointSchema).min(1).max(MAXIMUM_POINT_COUNT).readonly(),
  })
  .readonly()

const pictureDiaryWeatherSchema = z
  .object({
    condition: z.enum(WEATHER_CONDITIONS),
    temperatureCelsius: z.number().finite().nullable(),
  })
  .readonly()

const pictureDiaryEntrySchema = z
  .object({
    createdAt: z.iso.datetime(),
    date: z.iso.date(),
    id: z.string().min(1),
    strokes: z.array(strokeSchema).max(MAXIMUM_STROKE_COUNT).readonly(),
    text: z.string().trim().max(MAXIMUM_PICTURE_DIARY_TEXT_LENGTH),
    updatedAt: z.iso.datetime(),
    version: z.literal(1),
    weather: pictureDiaryWeatherSchema.optional(),
  })
  .refine((entry) => entry.text.length > 0 || entry.strokes.length > 0)
  .readonly()

export type PictureDiaryEntry = z.infer<typeof pictureDiaryEntrySchema>
export type PictureDiaryPoint = z.infer<typeof pointSchema>
export type PictureDiaryStroke = z.infer<typeof strokeSchema>
export type PictureDiaryWeather = z.infer<typeof pictureDiaryWeatherSchema>

export interface CreatePictureDiaryEntryOptions {
  readonly createdAt: string
  readonly date: string
  readonly id: string
  readonly now: Date
  readonly strokes: ReadonlyArray<PictureDiaryStroke>
  readonly text: string
  readonly weather?: PictureDiaryWeather
}

export const createPictureDiaryEntry = (
  options: CreatePictureDiaryEntryOptions,
): PictureDiaryEntry =>
  pictureDiaryEntrySchema.parse({
    createdAt: options.createdAt,
    date: options.date,
    id: options.id,
    strokes: options.strokes,
    text: options.text,
    updatedAt: options.now.toISOString(),
    version: 1,
    ...(options.weather === undefined ? {} : {weather: options.weather}),
  })

export const parsePictureDiaryEntry = (value: unknown): PictureDiaryEntry | null => {
  const result = pictureDiaryEntrySchema.safeParse(value)
  return result.success ? result.data : null
}

export const parsePictureDiaryEntries = (
  value: unknown,
): ReadonlyArray<PictureDiaryEntry> | null => {
  const result = z.array(pictureDiaryEntrySchema).readonly().safeParse(value)
  return result.success ? result.data : null
}

export const sortPictureDiaryEntries = (entries: ReadonlyArray<PictureDiaryEntry>) =>
  entries.toSorted(
    (left, right) =>
      right.date.localeCompare(left.date) ||
      right.createdAt.localeCompare(left.createdAt) ||
      right.id.localeCompare(left.id),
  )
