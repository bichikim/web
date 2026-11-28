/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import {daysInMonth, formatDate} from '../../civil-date'
import {
  getConvertibleLunarDays,
  getLunarToSolarResult,
  getMovingDays,
  lunarToSolar,
  solarToLunar,
} from '../lunar'

it.each(Array.from({length: 151}, (_, index) => 1900 + index))(
  'should match fresh public solar conversion for every month in %s',
  (year) => {
    for (let month = 1; month <= 12; month += 1) {
      const expected = Array.from({length: daysInMonth(year, month)}, (_, index) =>
        formatDate({day: index + 1, month, year}),
      ).filter((date) => {
        const lunar = solarToLunar(date)
        return lunar !== null && [9, 0].includes(lunar.day % 10)
      })

      expect(getMovingDays(year, month)).toEqual(expected)
    }
  },
)

it.each([
  {
    expected: ['1900-01-09', '1900-01-10', '1900-01-19', '1900-01-20', '1900-01-29', '1900-01-30'],
    month: 1,
    year: 1900,
  },
  {
    expected: ['1900-02-08', '1900-02-09', '1900-02-18', '1900-02-19', '1900-02-28'],
    month: 2,
    year: 1900,
  },
  {
    expected: ['1900-09-02', '1900-09-03', '1900-09-12', '1900-09-13', '1900-09-22', '1900-09-23'],
    month: 9,
    year: 1900,
  },
  {
    expected: ['2000-02-04', '2000-02-13', '2000-02-14', '2000-02-23', '2000-02-24'],
    month: 2,
    year: 2000,
  },
  {
    expected: ['2017-06-03', '2017-06-04', '2017-06-13', '2017-06-14', '2017-06-23'],
    month: 6,
    year: 2017,
  },
  {
    expected: ['2050-12-02', '2050-12-03', '2050-12-12', '2050-12-13', '2050-12-22', '2050-12-23'],
    month: 12,
    year: 2050,
  },
])('should retain the exact ordered list for $year-$month', ({expected, month, year}) => {
  expect(getMovingDays(year, month)).toEqual(expected)
})

it.each([
  [1899, 12],
  [2051, 1],
  [2026, 0],
  [2026, 13],
  [2026, -0],
  [2026, 1.5],
  [2026.5, 1],
  [Number.NaN, 1],
  [Number.POSITIVE_INFINITY, 1],
  [Number.NEGATIVE_INFINITY, 1],
  [2026, Number.NaN],
  [2026, Number.POSITIVE_INFINITY],
])('should reject an unsupported or invalid moving month %s-%s', (year, month) => {
  expect(getMovingDays(year, month)).toEqual([])
})

it.each([
  '',
  '2026-2-17',
  '2026-02-30',
  '1900-02-29',
  '1899-12-31',
  '2051-01-01',
  '2026-13-01',
  '２０２６-０２-３０',
  '2026-02-17T00:00:00Z',
  'abcd-ef-gh',
])('should retain the null contract for invalid public solar input %s', (value) => {
  expect(solarToLunar(value)).toBeNull()
})

it('should omit a failed solar conversion without reading the previous lunar state', () => {
  const expected = getMovingDays(2026, 2)
  const original = KoreanLunarCalendar.prototype.setSolarDate
  const setSolarDate = vi
    .spyOn(KoreanLunarCalendar.prototype, 'setSolarDate')
    .mockImplementation(function setSolarDate(this: KoreanLunarCalendar, year, month, day) {
      return year === 2026 && month === 2 && day === 26
        ? false
        : original.call(this, year, month, day)
    })

  try {
    expect(expected).toContain('2026-02-26')
    expect(getMovingDays(2026, 2)).toEqual(expected.filter((date) => date !== '2026-02-26'))
    expect(solarToLunar('2026-02-26')).toBeNull()
  } finally {
    setSolarDate.mockRestore()
  }
})
it('should match KASI 2026 lunar new year and round trip a leap month', () => {
  expect(solarToLunar('2026-02-17')).toEqual({day: 1, leap: false, month: 1, year: 2026})
  expect(lunarToSolar({day: 1, leap: true, month: 5, year: 2017})).toBe('2017-06-24')
  expect(solarToLunar('2017-06-24')).toEqual({day: 1, leap: true, month: 5, year: 2017})
})

it('should convert a solar date entered with fullwidth digits', () => {
  const ascii = solarToLunar('2026-02-17')

  expect(ascii).toEqual({day: 1, leap: false, month: 1, year: 2026})
  expect(solarToLunar('２０２６-０２-１７')).toEqual(ascii)
})

it('should reject impossible leap months dates and unsupported years', () => {
  expect(lunarToSolar({day: 1, leap: true, month: 1, year: 2026})).toBeNull()
  expect(solarToLunar('2026-02-30')).toBeNull()
  expect(solarToLunar('2051-01-01')).toBeNull()
})
it('should list only existing lunar days ending in nine or zero', () => {
  const dates = getMovingDays(2026, 2)
  expect(dates).toContain('2026-02-25')
  expect(dates).toContain('2026-02-26')
  expect(dates.every((date) => [9, 0].includes((solarToLunar(date)?.day ?? -1) % 10))).toBe(true)
})

it('should round trip both solar range boundaries and reject earlier solar results', () => {
  for (const date of ['1900-01-01', '2050-12-31']) {
    const lunar = solarToLunar(date)
    expect(lunar).not.toBeNull()
    if (lunar !== null) {
      expect(lunarToSolar(lunar)).toBe(date)
    }
  }
  expect(lunarToSolar({day: 1, leap: false, month: 1, year: 1899})).toBeNull()
})

it('should distinguish dates outside converter coverage from nonexistent lunar dates', () => {
  expect(getLunarToSolarResult({day: 18, leap: false, month: 11, year: 2050})).toEqual({
    status: 'converted',
    value: '2050-12-31',
  })
  expect(getLunarToSolarResult({day: 19, leap: false, month: 11, year: 2050})).toEqual({
    status: 'unsupported',
  })
  expect(getLunarToSolarResult({day: 1, leap: false, month: 12, year: 2050})).toEqual({
    status: 'unsupported',
  })
  expect(getLunarToSolarResult({day: 1, leap: true, month: 1, year: 2026})).toEqual({
    status: 'invalid',
  })
  expect(getConvertibleLunarDays({leap: false, month: 11, year: 2050})).toEqual(
    Array.from({length: 18}, (_, index) => index + 1),
  )
  expect(getConvertibleLunarDays({leap: false, month: 1, year: 2026})).toHaveLength(30)
  expect(getConvertibleLunarDays({leap: false, month: 2, year: 2026})).toHaveLength(29)
})
