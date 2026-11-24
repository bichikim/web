/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {afterEach, expect, it, vi} from 'vitest'
import {createLibraryRepository} from '../library-repository'
import {DEFAULT_POFFO_VOICE} from '../voice'
import {DEFAULT_POFFO_SPEECH} from '../library-model'
import {trackingProfile} from '../tracking-profile'

const repositories: ReturnType<typeof createLibraryRepository>[] = []

it('should persist separate calibration and bindings for each input mode across reopen', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  await Promise.all(
    (
      [
        ['cursor', 1],
        ['camera', 0.4],
        ['camera-pose', 2],
      ] as const
    ).map(async ([mode, speed]) => {
      await repository.configureTracking(
        widget.id,
        {bodyFollowSpeed: speed, eyeCenterX: speed, headFollowSpeed: speed},
        mode,
      )
      await repository.bindWidget(widget.id, {headX: {parameterId: mode}}, mode)
    }),
  )
  repository.close()
  const saved = (await open().read()).widgets[0]!
  expect(saved.trackingProfiles).toEqual({
    camera: {
      bindings: {headX: {parameterId: 'camera'}},
      options: {bodyFollowSpeed: 0.4, eyeCenterX: 0.4, headFollowSpeed: 0.4},
    },
    'camera-pose': {
      bindings: {headX: {parameterId: 'camera-pose'}},
      options: {bodyFollowSpeed: 2, eyeCenterX: 2, headFollowSpeed: 2},
    },
    cursor: {
      bindings: {headX: {parameterId: 'cursor'}},
      options: {bodyFollowSpeed: 1, eyeCenterX: 1, headFollowSpeed: 1},
    },
  })
})

it('should persist each bubble type across reopen without changing another widget', async () => {
  const repository = open()
  const first = await repository.addWidget('character')
  const second = await repository.addWidget('character')
  await repository.configureSpeech(first.id, {
    ...DEFAULT_POFFO_SPEECH,
    showCharacter: false,
    showCodex: true,
  })
  await repository.configureSpeech(second.id, {
    ...DEFAULT_POFFO_SPEECH,
    showCharacter: true,
    showCodex: false,
  })
  repository.close()
  const saved = (await open().read()).widgets
  expect(saved.find((widget) => widget.id === first.id)?.speech).toMatchObject({
    enabled: true,
    showCharacter: false,
    showCodex: true,
  })
  expect(saved.find((widget) => widget.id === second.id)?.speech).toMatchObject({
    enabled: true,
    showCharacter: true,
    showCodex: false,
  })
})

it('should enable local narration and voice lip sync by default across reopen', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  repository.close()
  const saved = (await open().read()).widgets.find((item) => item.id === widget.id)!
  expect(saved.speech?.voice).toMatchObject({enabled: true, language: 'ko', provider: 'local'})
  expect(saved.speech?.lipsync).toMatchObject({gain: 1.5, source: 'voice'})
})

it('should fill missing narration preferences without re-enabling explicitly disabled inputs', async () => {
  const repository = open()
  const missing = await repository.addWidget('missing')
  const disabled = await repository.addWidget('disabled')
  await repository.configureSpeech(missing.id, {enabled: true, x: 0.2, y: 0.3})
  await repository.configureSpeech(disabled.id, {
    enabled: true,
    lipsync: {source: 'off'},
    voice: {...DEFAULT_POFFO_VOICE, enabled: false, voice: 'Hana'},
    x: 0.4,
    y: 0.5,
  })
  repository.close()
  const widgets = (await open().read()).widgets
  expect(widgets.find((item) => item.id === missing.id)?.speech).toMatchObject({
    lipsync: {source: 'voice'},
    voice: {enabled: true},
    x: 0.2,
    y: 0.3,
  })
  expect(widgets.find((item) => item.id === disabled.id)?.speech).toMatchObject({
    lipsync: {source: 'off'},
    voice: {enabled: false, voice: 'Hana'},
    x: 0.4,
    y: 0.5,
  })
})

it('should persist independent state connections alongside existing lip-sync and voice preferences', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  const speech = {
    agentBindings: {error: {parameterId: 'alert'}, working: {off: 0, on: 0.8, parameterId: 'busy'}},
    enabled: false,
    lipsync: {source: 'voice' as const},
    voice: DEFAULT_POFFO_VOICE,
    x: 0.9,
    y: 0.05,
  }
  await repository.configureSpeech(widget.id, speech)
  repository.close()
  expect((await open().read()).widgets[0]?.speech).toEqual(speech)
})

it('should persist each widget lip sync connection without replacing its voice settings', async () => {
  const repository = open()
  const first = await repository.addWidget('character')
  const second = await repository.addWidget('character')
  await repository.configureSpeech(first.id, {
    enabled: true,
    lipsync: {gain: 1.2, inverted: true, parameterId: 'custom-mouth', source: 'voice'},
    voice: DEFAULT_POFFO_VOICE,
    x: 0.9,
    y: 0.05,
  })
  await repository.configureSpeech(second.id, {
    enabled: true,
    lipsync: {source: 'speech'},
    x: 0.9,
    y: 0.05,
  })
  repository.close()
  const widgets = (await open().read()).widgets
  expect(widgets.find((widget) => widget.id === first.id)?.speech).toMatchObject({
    lipsync: {gain: 1.2, inverted: true, parameterId: 'custom-mouth', source: 'voice'},
    voice: DEFAULT_POFFO_VOICE,
  })
  expect(widgets.find((widget) => widget.id === second.id)?.speech?.lipsync?.source).toBe('speech')
})

it('should persist one widget motion without changing other widget preferences', async () => {
  const repository = open()
  const first = await repository.addWidget('character')
  const second = await repository.addWidget('character')
  await repository.trackWidget(first.id, 'cursor')
  await repository.setWidgetMotion(first.id, 'wave')
  await repository.setWidgetMotion(second.id, null)
  repository.close()
  const reopened = open()
  expect((await reopened.read()).widgets).toEqual(
    expect.arrayContaining([
      expect.objectContaining({id: first.id, motionId: 'wave', tracking: 'cursor'}),
      expect.objectContaining({id: second.id, motionId: null}),
    ]),
  )
  await reopened.setWidgetMotion(first.id, undefined)
  expect(
    (await reopened.read()).widgets.find((item) => item.id === first.id)?.motionId,
  ).toBeUndefined()
  await expect(reopened.setWidgetMotion(first.id, '')).rejects.toThrow()
})

it('should persist independent speech visibility and position without changing tracking or other widgets', async () => {
  const repository = open()
  const first = await repository.addWidget('first')
  const second = await repository.addWidget('second')
  await repository.trackWidget(first.id, 'cursor')
  await repository.configureSpeech(first.id, {enabled: false, wrap: false, x: -0.4, y: 0.8})
  await repository.configureSpeech(second.id, {enabled: true, x: 1.2, y: 0.1})
  repository.close()
  const widgets = (await open().read()).widgets
  expect(widgets.find((widget) => widget.id === first.id)).toMatchObject({
    speech: {enabled: false, wrap: false, x: -0.4, y: 0.8},
    tracking: 'cursor',
  })
  expect(widgets.find((widget) => widget.id === second.id)?.speech).toEqual({
    ...DEFAULT_POFFO_SPEECH,
    enabled: true,
    x: 1.2,
    y: 0.1,
  })
  await expect(
    open().configureSpeech(first.id, {enabled: true, x: Infinity, y: 0}),
  ).rejects.toThrow()
})

it('should persist per-widget tracking choices across reopen without reviving removed widgets', async () => {
  const repository = open()
  const first = await repository.addWidget('first')
  const second = await repository.addWidget('second')
  await repository.trackWidget(first.id, 'camera')
  await repository.trackWidget(second.id, 'cursor')
  await repository.configureTracking(first.id, {
    cameraX: -0.2,
    centerX: 0.1,
    cursorReach: 0.5,
    eyeCenterX: -0.2,
    eyeCenterY: 0.4,
    eyeLimitY: 0,
    eyeVerticalScale: 3,
    headCenterX: -3,
    headCenterY: 5,
    headLimitX: 10,
    headMaximumX: 7,
    headMinimumX: -2,
    headScale: 1.5,
    headVerticalScale: 3,
  })
  await repository.bindWidget(first.id, {
    eyeX: {parameterId: null},
    headX: {blend: 'add', inverted: true, parameterId: 'custom-turn'},
  })
  repository.close()
  const reopened = open()
  expect(
    (await reopened.read()).widgets.map((widget) => ({
      ...widget,
      trackingBindings: trackingProfile(widget).bindings,
      trackingOptions: trackingProfile(widget).options,
    })),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: first.id,
        tracking: 'camera',
        trackingBindings: {
          eyeX: {parameterId: null},
          headX: {blend: 'add', inverted: true, parameterId: 'custom-turn'},
        },
        trackingOptions: {
          cameraX: -0.2,
          centerX: 0.1,
          cursorReach: 0.5,
          eyeCenterX: -0.2,
          eyeCenterY: 0.4,
          eyeLimitY: 0,
          eyeVerticalScale: 3,
          headCenterX: -3,
          headCenterY: 5,
          headLimitX: 10,
          headMaximumX: 7,
          headMinimumX: -2,
          headScale: 1.5,
          headVerticalScale: 3,
        },
      }),
      expect.objectContaining({id: second.id, tracking: 'cursor'}),
    ]),
  )
  await reopened.removeWidget(first.id)
  await reopened.trackWidget(first.id, 'off')
  await reopened.configureTracking(first.id, {headScale: 2})
  expect((await reopened.read()).widgets).toHaveLength(1)
  await expect(reopened.configureTracking(second.id, {distance: 0})).rejects.toThrow()
  await expect(reopened.trackWidget(second.id, 'both' as never)).rejects.toThrow()
})
const open = () => {
  const repository = createLibraryRepository('wallpaper-test-library')
  repositories.push(repository)
  return repository
}
afterEach(async () => {
  repositories.forEach((repository) => repository.close())
  repositories.length = 0
  await Dexie.delete('wallpaper-test-library')
})

it('should remember each monitor website and deduplicate visits across reopen', async () => {
  const repository = open()
  await repository.visit({monitorId: 'first', url: 'https://example.com', visitedAt: 1})
  await repository.visit({monitorId: 'second', url: 'https://example.org', visitedAt: 2})
  await repository.visit({monitorId: 'first', url: 'https://example.com/', visitedAt: 3})
  repository.close()
  const snapshot = await open().read()
  expect(snapshot.history).toEqual([
    {url: 'https://example.com/', visitedAt: 3},
    {url: 'https://example.org/', visitedAt: 2},
    {url: 'https://bruno-simon.com/', visitedAt: 0},
  ])
  expect(snapshot.websites).toEqual([
    {monitorId: 'first', url: 'https://example.com/'},
    {monitorId: 'second', url: 'https://example.org/'},
  ])
})

it('should delete one history entry without clearing the remembered address or other visits', async () => {
  const repository = open()
  await repository.visit({monitorId: 'first', url: 'https://example.com', visitedAt: 1})
  await repository.visit({monitorId: 'first', url: 'https://example.org', visitedAt: 2})
  await repository.removeVisit('https://example.org/')
  const snapshot = await repository.read()
  expect(snapshot.history).toEqual([
    {url: 'https://example.com/', visitedAt: 1},
    {url: 'https://bruno-simon.com/', visitedAt: 0},
  ])
  expect(snapshot.websites).toEqual([{monitorId: 'first', url: 'https://example.org/'}])
})

it('should reject a non-web URL without changing history', async () => {
  const repository = open()
  const original = (await repository.read()).history
  await expect(
    repository.visit({monitorId: 'first', url: 'file:///tmp/site.html', visitedAt: 1}),
  ).rejects.toThrow()
  expect((await repository.read()).history).toEqual(original)
})

it('should offer one example without selecting it and keep its deletion across reopen', async () => {
  const repository = open()
  expect((await repository.read()).history).toEqual([
    {url: 'https://bruno-simon.com/', visitedAt: 0},
  ])
  expect((await repository.read()).websites).toEqual([])
  await repository.removeVisit('https://bruno-simon.com/')
  repository.close()
  expect((await open().read()).history).toEqual([])
})

it('should add the example to a version-one library without replacing existing data', async () => {
  const legacy = new Dexie('wallpaper-test-library')
  legacy.version(1).stores({history: '&url,visitedAt', websites: '&monitorId', widgets: '&id'})
  try {
    await legacy.table('history').put({url: 'https://example.org/', visitedAt: 12})
    await legacy.table('websites').put({monitorId: 'monitor', url: 'https://example.org/'})
    await legacy.table('widgets').put({assetId: 'custom', id: 'existing', x: 3, y: 4})
  } finally {
    legacy.close()
  }
  const snapshot = await open().read()
  expect(snapshot.history).toEqual([
    {url: 'https://example.org/', visitedAt: 12},
    {url: 'https://bruno-simon.com/', visitedAt: 0},
  ])
  expect(snapshot.websites).toEqual([{monitorId: 'monitor', url: 'https://example.org/'}])
  expect(snapshot.widgets).toMatchObject([{assetId: 'custom', id: 'existing', x: 3, y: 4}])
})

it('should retain the real visit when the example already exists before upgrading', async () => {
  const legacy = new Dexie('wallpaper-test-library')
  legacy.version(1).stores({history: '&url,visitedAt', websites: '&monitorId', widgets: '&id'})
  try {
    await legacy.table('history').put({url: 'https://bruno-simon.com/', visitedAt: 42})
  } finally {
    legacy.close()
  }
  expect((await open().read()).history).toEqual([{url: 'https://bruno-simon.com/', visitedAt: 42}])
})

it('should persist independent widgets and their positions without reviving a removed widget', async () => {
  const repository = open()
  const first = await repository.addWidget('first-asset')
  const second = await repository.addWidget('second-asset')
  await repository.moveWidget(first.id, {x: -50, y: 200})
  repository.close()
  const reopened = open()
  const snapshot = await reopened.read()
  expect(snapshot.widgets.find((widget) => widget.id === first.id)).toMatchObject({
    assetId: 'first-asset',
    x: -50,
    y: 200,
  })
  expect(snapshot.widgets.find((widget) => widget.id === second.id)).toMatchObject({
    assetId: 'second-asset',
    x: null,
    y: null,
  })
  await reopened.removeWidget(first.id)
  await reopened.moveWidget(first.id, {x: 100, y: 100})
  expect((await reopened.read()).widgets.map((widget) => widget.id)).toEqual([second.id])
})

it('should retain widget size across reopen while accepting older widgets without a size', async () => {
  const repository = open()
  const original = await repository.addWidget('original')
  const resized = await repository.addWidget('resized')
  await repository.resizeWidget(resized.id, {height: 630, width: 480})
  repository.close()
  const snapshot = await open().read()
  expect(snapshot.widgets.find((widget) => widget.id === original.id)?.size).toBeUndefined()
  expect(snapshot.widgets.find((widget) => widget.id === resized.id)?.size).toEqual({
    height: 630,
    width: 480,
  })
})

it('should reject invalid widget dimensions and never revive a removed widget on resize', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  await expect(repository.resizeWidget(widget.id, {height: 630, width: 0})).rejects.toThrow()
  expect((await repository.read()).widgets[0]?.size).toBeUndefined()
  await repository.removeWidget(widget.id)
  await repository.resizeWidget(widget.id, {height: 630, width: 480})
  expect((await repository.read()).widgets).toEqual([])
})

it('should load legacy local voices and persist independent ChatGPT selection across reopen', async () => {
  const repository = open()
  const first = await repository.addWidget('first')
  const second = await repository.addWidget('second')
  const {provider: _, ...legacy} = {...DEFAULT_POFFO_VOICE, voice: 'Hana'}
  const database = await new Dexie('wallpaper-test-library').open()
  try {
    await database
      .table('widgets')
      .put({...first, speech: {enabled: true, voice: legacy, x: 0.9, y: 0.05}})
  } finally {
    database.close()
  }
  const loaded = (await repository.read()).widgets.find((widget) => widget.id === first.id)!
  expect(loaded.speech?.voice).toEqual({...DEFAULT_POFFO_VOICE, voice: 'Hana'})
  await repository.configureSpeech(first.id, {
    ...loaded.speech!,
    voice: {...loaded.speech!.voice!, provider: 'chatgpt'},
  })
  repository.close()
  const widgets = (await open().read()).widgets
  expect(widgets.find((widget) => widget.id === first.id)?.speech?.voice).toMatchObject({
    provider: 'chatgpt',
    voice: 'Hana',
  })
  expect(widgets.find((widget) => widget.id === second.id)?.speech?.voice).toEqual(
    DEFAULT_POFFO_VOICE,
  )
})

it('should preserve an explicit per-widget CPU preference across reopening the library', async () => {
  const repository = open()
  const widget = await repository.addWidget('model')
  await repository.configureSpeech(widget.id, {
    enabled: true,
    voice: {...DEFAULT_POFFO_VOICE, gpu: false, model: 'full'},
    x: 0.5,
    y: 0.1,
  })
  repository.close()
  expect((await open().read()).widgets[0].speech?.voice).toMatchObject({gpu: false, model: 'full'})
})

it('should move a bubble without replacing its latest voice and lip sync preferences', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  await repository.moveSpeech(widget.id, {x: -0.25, y: 1.2})
  expect((await repository.read()).widgets[0].speech).toEqual({
    ...DEFAULT_POFFO_SPEECH,
    x: -0.25,
    y: 1.2,
  })
  await repository.configureSpeech(widget.id, {
    enabled: true,
    lipsync: {source: 'voice'},
    voice: DEFAULT_POFFO_VOICE,
    wrap: false,
    x: -0.25,
    y: 1.2,
  })
  await repository.moveSpeech(widget.id, {anchor: 'bottom', x: 1.25, y: -0.2})
  repository.close()
  expect((await open().read()).widgets[0].speech).toEqual({
    anchor: 'bottom',
    enabled: true,
    lipsync: {source: 'voice'},
    voice: DEFAULT_POFFO_VOICE,
    wrap: false,
    x: 1.25,
    y: -0.2,
  })
})

it('should retain user semantic rules and parameter output modes after reopening the library', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  const semanticBindings = [
    {
      enabled: true,
      from: -30,
      id: 'happy',
      mode: 'range' as const,
      parameterId: 'angle',
      text: '기쁘고 신나는 내용',
      threshold: 0.75,
      to: 30,
    },
  ]
  await repository.configureSpeech(widget.id, {
    enabled: true,
    semanticBindings,
    voice: DEFAULT_POFFO_VOICE,
    x: 0.9,
    y: 0.05,
  })
  await repository.moveSpeech(widget.id, {x: 1, y: 0.2})
  repository.close()
  expect((await open().read()).widgets[0].speech).toMatchObject({
    semanticBindings,
    voice: DEFAULT_POFFO_VOICE,
  })
})

it('should persist a complete connection profile atomically without changing speech layout or voice', async () => {
  const repository = open()
  const widget = await repository.addWidget('builtin:ash')
  await repository.configureSpeech(widget.id, {
    enabled: false,
    voice: DEFAULT_POFFO_VOICE,
    wrap: false,
    x: 0.3,
    y: 0.4,
  })
  await repository.configureConnections(widget.id, {
    lipsync: {parameterId: 'ParamMouthOpenY', source: 'speech'},
    semanticBindings: [
      {
        enabled: true,
        id: 'happy',
        mode: 'toggle',
        parameterId: 'Param71',
        text: '기쁨',
        threshold: 0.7,
      },
    ],
    tracking: 'cursor',
    trackingBindings: {headX: {inverted: true, parameterId: 'ParamAngleX'}},
    trackingOptions: {
      bodyFollowSpeed: 2.5,
      bodyScale: 0.6,
      eyeFollowSpeed: 2,
      headFollowSpeed: 0.5,
      headMaximumX: 18,
      headMinimumX: -12,
    },
  })
  repository.close()
  const reopened = open()
  const stored = (await reopened.read()).widgets[0]!
  expect(stored.speech).toMatchObject({
    enabled: false,
    lipsync: {parameterId: 'ParamMouthOpenY', source: 'speech'},
    semanticBindings: [expect.objectContaining({id: 'happy'})],
    voice: DEFAULT_POFFO_VOICE,
    wrap: false,
    x: 0.3,
    y: 0.4,
  })
  expect(stored.trackingOptions).toEqual({
    bodyFollowSpeed: 2.5,
    bodyScale: 0.6,
    eyeFollowSpeed: 2,
    headFollowSpeed: 0.5,
    headMaximumX: 18,
    headMinimumX: -12,
  })
  expect(stored.tracking).toBe('cursor')
  expect(stored.trackingBindings?.headX).toEqual({inverted: true, parameterId: 'ParamAngleX'})
  await reopened.configureConnections(widget.id, {trackingOptions: {eyeCenterX: 0.2}})
  expect((await reopened.read()).widgets[0]).toMatchObject({
    tracking: 'cursor',
    trackingOptions: {eyeCenterX: 0.2, headMaximumX: 18, headMinimumX: -12},
  })
  await reopened.configureConnections(widget.id, {trackingOptions: {eyeCenterX: 0.3}}, 'replace')
  expect((await reopened.read()).widgets[0]?.trackingOptions).toEqual({eyeCenterX: 0.3})
})

it('should retain explicit empty bindings when initializing defaults', async () => {
  const reopened = open()
  const widget = await reopened.addWidget('builtin:ash')
  await reopened.configureConnections(widget.id, {semanticBindings: []})
  await reopened.configureConnections(
    widget.id,
    {
      semanticBindings: [
        {
          enabled: true,
          id: 'default',
          mode: 'toggle',
          parameterId: 'Param71',
          text: '기본',
          threshold: 0.7,
        },
      ],
    },
    'missing',
  )
  expect((await reopened.read()).widgets[0]?.speech?.semanticBindings).toEqual([])
})

it('should serialize conditional migrations against the latest stored widget', async () => {
  const repository = open()
  const other = open()
  const widget = await repository.addWidget('character')
  await repository.configureConnections(widget.id, {
    trackingBindings: {headX: {inverted: true, parameterId: 'custom-head'}},
  })
  const migrate = vi.fn((current: typeof widget) =>
    current.trackingBindingsVersion === 1
      ? undefined
      : {
          trackingBindings: {
            ...current.trackingBindings,
            headX: {...current.trackingBindings?.headX, blend: 'add' as const},
          },
          trackingBindingsVersion: 1,
        },
  )
  await Promise.all([
    repository.migrateConnections(widget.id, migrate),
    other.migrateConnections(widget.id, migrate),
  ])
  expect(migrate.mock.calls.map(([current]) => current.trackingBindingsVersion)).toEqual([
    undefined,
    1,
  ])
  expect((await repository.read()).widgets[0]).toMatchObject({
    trackingBindings: {headX: {blend: 'add', inverted: true, parameterId: 'custom-head'}},
    trackingBindingsVersion: 1,
  })
})

it('should skip a removed widget during migration while explicit configuration still rejects it', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  await repository.removeWidget(widget.id)
  const migrate = vi.fn(() => ({trackingBindingsVersion: 1}))
  await repository.migrateConnections(widget.id, migrate)
  expect(migrate).not.toHaveBeenCalled()
  expect((await repository.read()).widgets).toEqual([])
  await expect(repository.configureConnections(widget.id, {})).rejects.toThrow(
    'Poffo widget is unavailable',
  )
})

it('should leave stored settings unchanged when a migration returns no patch', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  await repository.configureConnections(widget.id, {trackingBindingsVersion: 1})
  const before = await repository.read()
  await repository.migrateConnections(widget.id, () => undefined)
  expect(await repository.read()).toEqual(before)
})

it('should reject an invalid migration without changing its revision or bindings', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  await repository.configureConnections(widget.id, {
    trackingBindings: {headX: {parameterId: 'original'}},
  })
  const before = await repository.read()
  await expect(
    repository.migrateConnections(widget.id, () => ({
      trackingBindings: {headX: {parameterId: 'changed'}},
      trackingBindingsVersion: -1,
    })),
  ).rejects.toThrow()
  expect(await repository.read()).toEqual(before)
  await repository.migrateConnections(widget.id, () => ({trackingBindingsVersion: 1}))
  expect((await repository.read()).widgets[0]?.trackingBindingsVersion).toBe(1)
})

it('should reject invalid connections before replacing stored values', async () => {
  const reopened = open()
  const widget = await reopened.addWidget('character')
  await reopened.configureConnections(widget.id, {semanticBindings: []})
  await expect(
    reopened.configureConnections(widget.id, {
      semanticBindings: [
        {enabled: true, id: 'bad', mode: 'toggle', parameterId: null, text: '', threshold: 2},
      ],
    }),
  ).rejects.toThrow()
  expect((await reopened.read()).widgets[0]?.speech?.semanticBindings).toEqual([])
})

it('should toggle registered menu bundles transactionally and preserve unrelated speech settings', async () => {
  const repository = open()
  const widget = await repository.addWidget('character')
  const entry = {
    action: {id: 'tiny', kind: 'expression' as const},
    category: 'menu' as const,
    enabled: true,
    exclusiveGroup: 'body',
    id: 'tiny',
    mode: 'toggle' as const,
    parameterId: null,
    text: '',
    threshold: 0.8,
  }
  await repository.configureSpeech(widget.id, {
    enabled: true,
    semanticBindings: [
      entry,
      {...entry, id: 'large'},
      {...entry, exclusiveGroup: 'accessory', id: 'glasses'},
    ],
    voice: DEFAULT_POFFO_VOICE,
    x: 0.2,
    y: 0.4,
  })
  await Promise.all([
    repository.toggleWidgetAction(widget.id, 'tiny'),
    repository.toggleWidgetAction(widget.id, 'glasses'),
  ])
  const speech = (await repository.read()).widgets[0]!.speech!
  expect(
    speech.semanticBindings?.filter((binding) => binding.menuActive).map((binding) => binding.id),
  ).toEqual(['tiny', 'glasses'])
  await repository.toggleWidgetAction(widget.id, 'large')
  expect(
    (await repository.read()).widgets[0]!.speech?.semanticBindings?.filter(
      (binding) => binding.menuActive,
    ).map((binding) => binding.id),
  ).toEqual(['large', 'glasses'])
  await repository.toggleWidgetAction(widget.id, 'large')
  expect((await repository.read()).widgets[0]!.speech).toMatchObject({
    voice: DEFAULT_POFFO_VOICE,
    x: 0.2,
    y: 0.4,
  })
  expect(
    (await repository.read()).widgets[0]!.speech?.semanticBindings?.filter(
      (binding) => binding.menuActive,
    ).map((binding) => binding.id),
  ).toEqual(['glasses'])
})
