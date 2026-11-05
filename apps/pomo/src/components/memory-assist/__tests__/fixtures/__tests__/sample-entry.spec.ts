import {expect, it} from 'vitest'
import type {PictureDiaryEntry} from '../../../../../features/picture-diary'
import {sampleEntry} from '../sample-entry'

it.each(['일기', '  일기  ', ''])('should preserve default values for text %j', (text) => {
  const first = sampleEntry(text)
  const second = sampleEntry(text)

  expect(first).toStrictEqual({
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: text,
    strokes: [],
    text,
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  })
  expect(second).toStrictEqual(first)
  expect(second).not.toBe(first)
  expect(second.strokes).not.toBe(first.strokes)
  expect(Object.isFrozen(first)).toBe(false)
  expect(Object.isFrozen(first.strokes)).toBe(false)
})

it('should preserve explicit fields and borrowed nested references', () => {
  const strokes: PictureDiaryEntry['strokes'] = [{points: [{x: 0.25, y: 0.5}]}]
  const weather: PictureDiaryEntry['weather'] = {condition: 'clear', temperatureCelsius: 24}
  const overrides = {
    createdAt: '2026-09-03T03:00:00.000Z',
    date: '2026-09-01',
    id: 'entry-1',
    strokes,
    updatedAt: '2026-09-26T00:00:00.000Z',
    weather,
  }
  const entry = sampleEntry('  기존 일기  ', overrides)

  expect(entry).toStrictEqual({...overrides, text: '  기존 일기  ', version: 1})
  expect(entry.strokes).toBe(strokes)
  expect(entry.strokes[0]).toBe(strokes[0])
  expect(entry.weather).toBe(weather)
  expect(Object.isFrozen(strokes)).toBe(false)
  expect(Object.isFrozen(weather)).toBe(false)
})

it('should keep dates independent from timestamps and optional keys absent by default', () => {
  const entry = sampleEntry('날짜만 변경', {date: '2026-09-03'})

  expect(entry.date).toBe('2026-09-03')
  expect(entry.createdAt).toBe('2026-09-04T03:00:00.000Z')
  expect(entry.updatedAt).toBe('2026-09-04T03:00:00.000Z')
  expect(Object.hasOwn(entry, 'weather')).toBe(false)
  expect(Object.hasOwn(entry, 'image')).toBe(false)
  expect(Object.hasOwn(sampleEntry('명시적 누락', {weather: undefined}), 'weather')).toBe(true)
})

it('should preserve shared arrays when spreading or freezing an entry', () => {
  const first = sampleEntry('원본')
  const second = {...first, id: 'second'}
  const frozen = Object.freeze(sampleEntry('고정', {strokes: first.strokes}))

  expect(second.strokes).toBe(first.strokes)
  expect(frozen.strokes).toBe(first.strokes)
  expect(Object.isFrozen(frozen)).toBe(true)
  expect(Object.isFrozen(first.strokes)).toBe(false)
})
