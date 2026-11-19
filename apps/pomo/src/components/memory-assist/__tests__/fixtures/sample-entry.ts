import type {PictureDiaryEntry} from '../../../../features/picture-diary'

/** Returns fresh test data; supplied fields and references are kept without normalization. */
export const sampleEntry = (
  text: string,
  overrides: Partial<
    Pick<PictureDiaryEntry, 'createdAt' | 'date' | 'id' | 'strokes' | 'updatedAt' | 'weather'>
  > = {},
): PictureDiaryEntry => ({
  createdAt: '2026-09-04T03:00:00.000Z',
  date: '2026-09-04',
  id: text,
  strokes: [],
  text,
  updatedAt: '2026-09-04T03:00:00.000Z',
  version: 1,
  ...overrides,
})
