/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('src/env', () => ({
  env: {KMA_SERVICE_KEY: 'decoded service key'},
}))

import {fetchKmaObservation, fetchKmaSky} from '../kma-client'
import * as kmaTime from '../kma-time'

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

const createKmaResponse = (items: ReadonlyArray<Record<string, unknown>>): Response =>
  Response.json({
    response: {
      body: {items: {item: items}},
      header: {resultCode: '00', resultMsg: 'NORMAL_SERVICE'},
    },
  })

const createItem = (category: string, value: string) => ({
  baseDate: '20260822',
  baseTime: '0900',
  category,
  nx: 60,
  ny: 127,
  obsrValue: value,
})

const createSkyItem = (forecastTime: string, value: string) => ({
  baseDate: '20260822',
  baseTime: '1430',
  category: 'SKY',
  fcstDate: '20260822',
  fcstTime: forecastTime,
  fcstValue: value,
  nx: 60,
  ny: 127,
})

it('should collect and normalize current observation values', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      createKmaResponse([
        createItem('T1H', '24.4'),
        createItem('REH', '70'),
        createItem('PTY', '0'),
        createItem('RN1', '-'),
        createItem('WSD', '2.1'),
      ]),
    )

  const observation = await fetchKmaObservation({
    baseTime: {date: '20260822', time: '0900'},
    fetcher,
    location: {gridX: 60, gridY: 127},
  })

  expect(observation).toMatchObject({
    humidityPercent: 70,
    precipitation: 'none',
    precipitationMillimeters: null,
    temperatureCelsius: 24.4,
    windSpeedMetersPerSecond: 2.1,
  })

  const observationUrl = new URL(String(fetcher.mock.calls[0]?.[0]))
  expect(observationUrl.pathname).toBe('/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst')
  expect(observationUrl.searchParams.get('ServiceKey')).toBe('decoded service key')
  expect(observationUrl.searchParams.get('base_time')).toBe('0900')
})

it('should normalize the nearest ultra-short sky value for the current display', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(createKmaResponse([createSkyItem('1500', '3'), createSkyItem('1600', '4')]))

  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('2026-08-22T05:50:00.000Z'),
    }),
  ).resolves.toBe('cloudy')

  const skyUrl = new URL(String(fetcher.mock.calls[0]?.[0]))
  expect(skyUrl.pathname).toBe('/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst')
  expect(skyUrl.searchParams.get('base_time')).toBe('1430')
})

it.each([
  [
    [{...createSkyItem('1500', '24'), category: 'T1H'}],
    'KMA forecast response contained no SKY value',
  ],
  [[createSkyItem('1500', '2')], 'KMA forecast contained an unsupported SKY value'],
] as const)('should reject an incomplete sky response', async (items, message) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(createKmaResponse(items))

  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('2026-08-22T05:50:00.000Z'),
    }),
  ).rejects.toThrow(message)
})

it('should reject a KMA application error even when HTTP succeeds', async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
    Response.json({
      response: {
        header: {resultCode: '03', resultMsg: 'NO_DATA'},
      },
    }),
  )

  await expect(
    fetchKmaObservation({
      baseTime: {date: '20260822', time: '0900'},
      fetcher,
      location: {gridX: 60, gridY: 127},
    }),
  ).rejects.toThrow('KMA request failed: 03 NO_DATA')
})

it.each([
  [{...createItem('PTY', '0')}, {date: '20260822', time: '1000'}],
  [
    {...createItem('PTY', '0'), nx: 61},
    {date: '20260822', time: '0900'},
  ],
] as const)(
  'should reject weather returned for different request input',
  async (item, baseTime) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(createKmaResponse([item]))

    await expect(
      fetchKmaObservation({
        baseTime,
        fetcher,
        location: {gridX: 60, gridY: 127},
      }),
    ).rejects.toThrow('KMA response input did not match the requested time and location')
  },
)

it.each([undefined, '9'])('should reject an unsupported precipitation value: %s', async (value) => {
  const items = [
    createItem('T1H', '24.4'),
    createItem('REH', '70'),
    createItem('RN1', '-'),
    createItem('WSD', '2.1'),
  ]

  if (value !== undefined) {
    items.push(createItem('PTY', value))
  }

  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(createKmaResponse(items))

  await expect(
    fetchKmaObservation({
      baseTime: {date: '20260822', time: '0900'},
      fetcher,
      location: {gridX: 60, gridY: 127},
    }),
  ).rejects.toThrow('KMA observation contained an unsupported PTY value')
})

it.each([
  ['1', 'rain'],
  ['4', 'rain'],
  ['5', 'rain'],
  ['2', 'mixed'],
  ['6', 'mixed'],
  ['3', 'snow'],
  ['7', 'snow'],
] as const)('should normalize precipitation code %s', async (value, precipitation) => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(createKmaResponse([createItem('PTY', value)]))

  await expect(
    fetchKmaObservation({
      baseTime: {date: '20260822', time: '0900'},
      fetcher,
      location: {gridX: 60, gridY: 127},
    }),
  ).resolves.toMatchObject({precipitation})
})

it('should normalize invalid and numeric observation measurements', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      createKmaResponse([
        {...createItem('PTY', '0'), obsrValue: 0},
        createItem('T1H', ''),
        createItem('REH', 'not-a-number'),
        createItem('RN1', '900'),
        createItem('WSD', '-900'),
      ]),
    )

  await expect(
    fetchKmaObservation({
      baseTime: {date: '20260822', time: '0900'},
      fetcher,
      location: {gridX: 60, gridY: 127},
    }),
  ).resolves.toMatchObject({
    humidityPercent: null,
    precipitation: 'none',
    precipitationMillimeters: null,
    temperatureCelsius: null,
    windSpeedMetersPerSecond: null,
  })
})

it.each([
  [1, 'clear'],
  [4, 'overcast'],
] as const)('should normalize numeric sky code %s', async (value, sky) => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      createKmaResponse([{...createSkyItem('1500', String(value)), fcstValue: value}]),
    )

  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('2026-08-22T06:00:00.000Z'),
    }),
  ).resolves.toBe(sky)
})

it.each([
  {...createSkyItem('1500', '1'), fcstDate: undefined},
  {...createSkyItem('1500', '1'), fcstTime: undefined},
])('should ignore SKY entries without a complete forecast timestamp', async (item) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(createKmaResponse([item]))

  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('2026-08-22T06:00:00.000Z'),
    }),
  ).rejects.toThrow('KMA forecast response contained no SKY value')
})

it('should reject HTTP failures, missing bodies, and empty item arrays', async () => {
  const baseOptions = {
    baseTime: {date: '20260822', time: '0900'} as const,
    location: {gridX: 60, gridY: 127},
  }

  await expect(
    fetchKmaObservation({
      ...baseOptions,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 503})),
    }),
  ).rejects.toThrow('KMA request failed with HTTP 503')

  await expect(
    fetchKmaObservation({
      ...baseOptions,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          response: {header: {resultCode: 0, resultMsg: 'NORMAL_SERVICE'}},
        }),
      ),
    }),
  ).rejects.toThrow('KMA response contained no body')

  await expect(
    fetchKmaObservation({
      ...baseOptions,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(createKmaResponse([])),
    }),
  ).rejects.toThrow('KMA response input did not match')
})

it('should use the global fetcher when one is not supplied', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(createKmaResponse([createItem('PTY', '0')]))
    .mockResolvedValueOnce(createKmaResponse([createSkyItem('1500', '1')]))
  vi.stubGlobal('fetch', fetcher)

  await fetchKmaObservation({
    baseTime: {date: '20260822', time: '0900'},
    location: {gridX: 60, gridY: 127},
  })
  await fetchKmaSky({
    baseTime: {date: '20260822', time: '1430'},
    location: {gridX: 60, gridY: 127},
    targetTime: new Date('2026-08-22T06:00:00.000Z'),
  })

  expect(fetcher).toHaveBeenCalledTimes(2)
  vi.unstubAllGlobals()
})

it.each([
  ['1', '4', 'clear'],
  ['4', '1', 'overcast'],
] as const)('should keep the first sky %s on an equal-distance tie', async (first, second, sky) => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      createKmaResponse([createSkyItem('1500', first), createSkyItem('1600', second)]),
    )
  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('2026-08-22T06:30:00.000Z'),
    }),
  ).resolves.toBe(sky)
})

it('should skip timestamp and target reads when only one sky item remains', async () => {
  const parse = vi.spyOn(kmaTime, 'parseKmaDateTime')
  const targetTime = new Date(0)
  const getTime = vi.spyOn(targetTime, 'getTime').mockImplementation(() => {
    throw new Error('the target is not needed for a singleton')
  })
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    createKmaResponse([
      {...createSkyItem('xxxx', '1'), fcstDate: 'notadate'},
      {...createSkyItem('1500', '4'), category: 'T1H'},
    ]),
  )
  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime,
    }),
  ).resolves.toBe('clear')
  expect(parse).not.toHaveBeenCalled()
  expect(getTime).not.toHaveBeenCalled()
})

it.each(['forecast', 'target'] as const)(
  'should retain the existing first sky when the %s timestamp is NaN',
  async (invalid) => {
    const first = createSkyItem('1500', '1')
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        createKmaResponse([
          invalid === 'forecast' ? {...first, fcstDate: 'notadate'} : first,
          createSkyItem('1600', '4'),
          createSkyItem('1700', '3'),
        ]),
      )
    const targetTime =
      invalid === 'target' ? new Date(Number.NaN) : new Date('2026-08-22T06:30:00.000Z')
    await expect(
      fetchKmaSky({
        baseTime: {date: '20260822', time: '1430'},
        fetcher,
        location: {gridX: 60, gridY: 127},
        targetTime,
      }),
    ).resolves.toBe('clear')
  },
)

it('should propagate the same target error after reading both forecast timestamps', async () => {
  const parse = vi.spyOn(kmaTime, 'parseKmaDateTime')
  const failure = new Error('caller target failed')
  const targetTime = new Date(0)
  vi.spyOn(targetTime, 'getTime').mockImplementation(() => {
    throw failure
  })
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(createKmaResponse([createSkyItem('1500', '1'), createSkyItem('1600', '4')]))
  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime,
    }),
  ).rejects.toBe(failure)
  expect(parse).toHaveBeenCalledTimes(2)
})

it('should keep an independently reentrant request from the target Date isolated', async () => {
  const targetTime = new Date('2026-08-22T05:50:00.000Z')
  const targetInstant = targetTime.getTime()
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(createKmaResponse([createSkyItem('1500', '1'), createSkyItem('1600', '4')]))
  let nested: ReturnType<typeof fetchKmaSky> | undefined
  const nestedFetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(createKmaResponse([createSkyItem('1700', '3'), createSkyItem('1800', '4')]))
  const getTime = vi.spyOn(targetTime, 'getTime').mockImplementationOnce(() => {
    nested = fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher: nestedFetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('2026-08-22T08:50:00.000Z'),
    })
    return targetInstant
  })
  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime,
    }),
  ).resolves.toBe('clear')
  expect(nested).toBeDefined()
  await expect(nested).resolves.toBe('overcast')
  expect(getTime).toHaveBeenCalledTimes(2)
})

it.each([
  ['reverse', ['1800', '1700', '1600', '1500']],
  ['shuffled', ['1700', '1500', '1800', '1600']],
] as const)('should select the nearest distinct sky from %s forecasts', async (_, times) => {
  const skyValues: Readonly<Record<string, string>> = {1500: '1', 1600: '3', 1700: '4', 1800: '1'}
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(createKmaResponse(times.map((time) => createSkyItem(time, skyValues[time]))))
  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('2026-08-22T06:50:00.000Z'),
    }),
  ).resolves.toBe('cloudy')
})

it('should retain the first sky for duplicate forecast timestamps', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      createKmaResponse([
        createSkyItem('1500', '4'),
        createSkyItem('1500', '1'),
        createSkyItem('1600', '3'),
      ]),
    )
  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('2026-08-22T06:00:00.000Z'),
    }),
  ).resolves.toBe('overcast')
})

it.each([
  ['epoch zero', '19700101', ['0903', '0900', '0905', '0901', '0904', '0902']],
  ['NaN', 'notadate', ['xxxx', '0902', '0901', '0900', '0904', '0903']],
] as const)(
  'should parse each compared %s timestamp at most once per request',
  async (_, date, times) => {
    const items = times.map((time) => ({...createSkyItem(time, '3'), fcstDate: date}))
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => createKmaResponse(items))
    const parse = vi.spyOn(kmaTime, 'parseKmaDateTime')
    const options = {
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('1970-01-01T00:00:00.000Z'),
    }
    await expect(fetchKmaSky(options)).resolves.toBe('cloudy')
    expect(parse.mock.calls.length).toBeGreaterThan(0)
    expect(parse.mock.calls.length).toBeLessThanOrEqual(items.length)
    parse.mockClear()
    await expect(fetchKmaSky(options)).resolves.toBe('cloudy')
    expect(parse.mock.calls.length).toBeGreaterThan(0)
    expect(parse.mock.calls.length).toBeLessThanOrEqual(items.length)
  },
)

it.each([36, 360, 1000])('should bound parsing to the %i compared forecast items', async (size) => {
  const items = Array.from({length: size}, (_, index) => {
    const minute = (index * 37) % size
    const hourText = Math.floor(minute / 60)
      .toString()
      .padStart(2, '0')
    const minuteText = (minute % 60).toString().padStart(2, '0')
    return createSkyItem(`${hourText}${minuteText}`, '3')
  })
  const parse = vi.spyOn(kmaTime, 'parseKmaDateTime')
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(createKmaResponse(items))
  await expect(
    fetchKmaSky({
      baseTime: {date: '20260822', time: '1430'},
      fetcher,
      location: {gridX: 60, gridY: 127},
      targetTime: new Date('2026-08-22T05:50:00.000Z'),
    }),
  ).resolves.toBe('cloudy')
  expect(parse.mock.calls.length).toBeGreaterThan(0)
  expect(parse.mock.calls.length).toBeLessThanOrEqual(size)
})
