/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {afterEach, expect, it} from 'vitest'
import previous from '../../connection-profiles/previous-bindings.json'
import {semanticBindingsSchema} from '@winter-love/wallpaper/settings/semantics'
import {builtinConnectionProfile} from '../../connection-profiles/builtin-profile'
import {createBuiltinLibrary} from '../create-builtin-library'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {DEFAULT_POFFO_SPEECH} from '@winter-love/wallpaper/settings/library-model'
import {DEFAULT_POFFO_TOUCH} from '@winter-love/wallpaper/settings/touch'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import {trackingProfile} from '@winter-love/wallpaper/settings/tracking-profile'

const name = 'builtin-connections-test'
const repositories: ReturnType<typeof createBuiltinLibrary>[] = []
const coatMenu = () =>
  builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!.find(
    (binding) => binding.id === 'ash:remove-coat',
  )!
const open = () => {
  const repository = createBuiltinLibrary(name)
  repositories.push(repository)
  return repository
}
it('should migrate every Ash input to additive blending once and preserve custom settings', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const other = await legacy.addWidget('other-character')
  await legacy.configureConnections(widget.id, {
    trackingBindings: {eyeY: {inverted: true, parameterId: 'custom-eye'}},
    trackingOptions: {headCenterX: 4},
    trackingProfiles: {
      camera: {bindings: {eyeX: {parameterId: null}}, options: {eyeFollowSpeed: 0.4}},
      cursor: {
        bindings: {bodyX: {parameterId: null}, headX: {inverted: true, parameterId: 'custom-head'}},
        options: {headFollowSpeed: 0.8},
      },
    },
  })
  await legacy.bindWidget(other.id, {headX: {blend: 'overwrite', parameterId: 'other-head'}})
  const before = (await legacy.read()).widgets.find((item) => item.id === widget.id)!
  legacy.close()
  const repository = open()
  const widgets = (await repository.read()).widgets
  const migrated = widgets.find((item) => item.id === widget.id)!
  expect(migrated.trackingBindingsVersion).toBe(1)
  for (const mode of ['cursor', 'camera', 'camera-pose', 'off'] as const) {
    const profile = trackingProfile(migrated, mode)
    expect(Object.values(profile.bindings ?? {})).toHaveLength(6)
    expect(Object.values(profile.bindings ?? {}).every((binding) => binding?.blend === 'add')).toBe(
      true,
    )
    expect(profile.options).toEqual(trackingProfile(before, mode).options)
  }
  expect(trackingProfile(migrated, 'cursor').bindings).toMatchObject({
    bodyX: {parameterId: null},
    headX: {inverted: true, parameterId: 'custom-head'},
  })
  expect(trackingProfile(migrated, 'camera').bindings?.eyeX?.parameterId).toBeNull()
  expect(trackingProfile(widgets.find((item) => item.id === other.id)).bindings?.headX?.blend).toBe(
    'overwrite',
  )
  const bindings = trackingProfile(migrated, 'cursor').bindings!
  await repository.bindWidget(
    widget.id,
    {...bindings, headX: {...bindings.headX, blend: 'overwrite'}},
    'cursor',
  )
  repository.close()
  const reopened = (await open().read()).widgets.find((item) => item.id === widget.id)!
  expect(trackingProfile(reopened, 'cursor').bindings?.headX?.blend).toBe('overwrite')
  expect(trackingProfile(reopened, 'camera').bindings?.headX?.blend).toBe('add')
})
it('should connect body gaze once without replacing saved face connections or an explicit body opt-out', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const bindings = {headX: {inverted: true, parameterId: 'my-face'}}
  await legacy.bindWidget(widget.id, bindings)
  await legacy.configureConnections(widget.id, {trackingBindingsVersion: 1})
  legacy.close()
  const repository = open()
  const migrated = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  expect(trackingProfile(migrated).bindings).toEqual({
    ...bindings,
    bodyX: {blend: 'add', parameterId: 'ParamBodyAngleX'},
  })
  await repository.bindWidget(widget.id, {...bindings, bodyX: {parameterId: null}})
  repository.close()
  expect(
    trackingProfile((await open().read()).widgets.find((item) => item.id === widget.id)).bindings,
  ).toEqual({...bindings, bodyX: {parameterId: null}})
})
it('should isolate saved hair gestures once without restoring removed controls or changing ponytails', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const ponytails = touchJointChains(
    builtinConnectionProfile('builtin:ash')!.connections.touch,
  ).filter((chain) => chain.id.startsWith('touch:ponytail-'))
  await legacy.configureSpeech(widget.id, {
    ...DEFAULT_POFFO_SPEECH,
    touch: {
      ...DEFAULT_POFFO_TOUCH,
      chains: ponytails,
      distance: 330,
      parameters: {
        Param19: {axis: 'x', gain: 0.3, parts: ['ArtMesh215']},
        Param25: {axis: 'x', gain: 0.7, parts: ['ArtMesh178']},
        Param28: {axis: 'off', gain: 0.4},
        Param29: {axis: 'auto', gain: 0.25},
        Param55: {axis: 'y', invert: true},
      },
    },
    touchBindingsVersion: 12,
  })
  legacy.close()
  const repository = open()
  const saved = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  expect(saved.speech?.touchBindingsVersion).toBe(13)
  expect(touchJointChains(saved.speech?.touch)).toEqual(ponytails)
  expect(saved.speech?.touch).toMatchObject({
    distance: 330,
    parameters: {
      Param55: {axis: 'y', invert: true},
      TouchHairFrontCenter25: {axis: 'x', gain: 0.7, parts: ['ArtMesh178']},
      TouchHairFrontCenter28: {axis: 'off', gain: 0.4},
      TouchHairSideLeft19: {axis: 'x', gain: 0.3, parts: ['ArtMesh215']},
      TouchHairSideLeft28: {axis: 'off', gain: 0.4},
      TouchHairSideLeft29: {axis: 'x', gain: 0.25},
    },
  })
  expect(saved.speech?.touch?.parameters).not.toHaveProperty('TouchHairFrontLeft19')
  expect(saved.speech?.touch?.parameters).not.toHaveProperty('TouchHairFrontCenter26')
  expect(saved.speech?.touch?.parameters).not.toHaveProperty('Param25')
  expect(saved.speech?.touch?.parameters).not.toHaveProperty('Param28')
  const edited = {...saved.speech!.touch!, parameters: {}}
  await repository.configureSpeech(widget.id, {...saved.speech!, touch: edited})
  repository.close()
  expect(
    (await open().read()).widgets.find((item) => item.id === widget.id)?.speech?.touch,
  ).toEqual(edited)
})
it('should connect bangs physics once and preserve ponytails and removed side settings', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const ponytails = touchJointChains(
    builtinConnectionProfile('builtin:ash')!.connections.touch,
  ).filter((chain) => chain.id.startsWith('touch:ponytail-'))
  const touch = {
    ...DEFAULT_POFFO_TOUCH,
    chains: [
      ...ponytails,
      {
        enabled: true,
        id: 'touch:front-center',
        joints: [{id: 'center', parameterId: 'TouchFrontCenter', response: 1}],
        name: '앞머리',
      },
    ],
    distance: 330,
    enabled: true,
    parameters: {Param25: {axis: 'x' as const, gain: 0.7}, TouchFrontCenter: {axis: 'x' as const}},
  }
  await legacy.configureSpeech(widget.id, {
    ...DEFAULT_POFFO_SPEECH,
    touch,
    touchBindingsVersion: 11,
  })
  legacy.close()
  const repository = open()
  const saved = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  expect(touchJointChains(saved.speech?.touch)).toEqual(ponytails)
  expect(saved.speech?.touch).toMatchObject({
    distance: 330,
    enabled: true,
    parameters: {
      TouchHairFrontCenter25: {axis: 'x', gain: 0.7, parts: expect.arrayContaining(['ArtMesh178'])},
      TouchHairFrontCenter26: {axis: 'x', gain: 1},
      TouchHairFrontCenter27: {axis: 'x', gain: 1},
    },
  })
  expect(saved.speech?.touch?.parameters).not.toHaveProperty('TouchFrontCenter')
  expect(saved.speech?.touch?.parameters).not.toHaveProperty('Param19')
  expect(saved.speech?.touchBindingsVersion).toBe(13)
  const edited = {...saved.speech!.touch!, parameters: {}}
  await repository.configureSpeech(widget.id, {...saved.speech!, touch: edited})
  repository.close()
  expect(
    (await open().read()).widgets.find((item) => item.id === widget.id)?.speech?.touch,
  ).toEqual(edited)
})
it('should replace generated hair rotations with authored physics once and preserve other settings', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const custom = {
    enabled: false,
    id: 'custom',
    joints: [{id: 'saved', parameterId: 'Param_Angle_Rotation21', response: 0.4}],
    name: '내 연결',
  }
  const touch = {
    ...DEFAULT_POFFO_TOUCH,
    chains: [
      custom,
      {
        enabled: true,
        id: 'touch:side-left',
        joints: [{id: 'x', parameterId: 'TouchSideLeft', response: 1}],
        name: '옆머리',
      },
    ],
    enabled: false,
    parameters: {
      Param19: {axis: 'off' as const, gain: 0.7},
      Param55: {axis: 'y' as const, invert: false},
      TouchSideLeft: {axis: 'x' as const},
    },
  }
  await legacy.configureSpeech(widget.id, {
    ...DEFAULT_POFFO_SPEECH,
    touch,
    touchBindingsVersion: 10,
  })
  legacy.close()
  const repository = open()
  const saved = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  expect(touchJointChains(saved.speech?.touch)).toEqual([custom])
  expect(saved.speech?.touch).toMatchObject({
    enabled: false,
    parameters: {
      Param55: {axis: 'y', invert: false},
      TouchHairFrontLeft19: {axis: 'off', gain: 0.7},
      TouchHairFrontLeft20: {axis: 'x'},
      TouchHairFrontLeft28: {axis: 'y', invert: true},
    },
  })
  expect(saved.speech?.touch?.parameters).not.toHaveProperty('TouchSideLeft')
  expect(saved.speech?.touchBindingsVersion).toBe(13)
  const edited = {
    ...saved.speech!.touch!,
    parameters: {Param55: {axis: 'y' as const, invert: false}},
  }
  await repository.configureSpeech(widget.id, {...saved.speech!, touch: edited})
  repository.close()
  expect(
    (await open().read()).widgets.find((item) => item.id === widget.id)?.speech?.touch,
  ).toEqual(edited)
})
it('should extend Ash with legs, hair, ears and bag targets without restoring removed old connections', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const touch = {
    ...DEFAULT_POFFO_TOUCH,
    chains: [],
    click: false,
    enabled: true,
    parameters: {
      Param55: {axis: 'y' as const, invert: false},
      ParamAngleX: {axis: 'x' as const, gain: 0.3},
    },
  }
  await legacy.configureSpeech(widget.id, {...DEFAULT_POFFO_SPEECH, touch, touchBindingsVersion: 7})
  legacy.close()
  const repository = open()
  const saved = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  const chains = touchJointChains(saved.speech?.touch)
  expect(chains).toHaveLength(5)
  expect(chains.every((chain) => chain.id.startsWith('touch:'))).toBe(true)
  expect(
    chains
      .find((chain) => chain.id === 'touch:right-leg')
      ?.joints.map((joint) => joint.parameterId),
  ).toEqual(['TouchRightHip', 'TouchRightKnee', 'TouchRightAnkle'])
  expect(saved.speech?.touch).toMatchObject({
    click: true,
    parameters: {
      Param41: {axis: 'x'},
      Param42: {axis: 'y', invert: true},
      Param43: {axis: 'x'},
      Param44: {axis: 'y', invert: true},
      Param55: {axis: 'y', invert: false},
      ParamAngleX: {axis: 'x', gain: 0.3, parts: expect.any(Array)},
    },
  })
  expect(saved.speech?.touch?.parameters?.ParamAngleX?.parts).not.toContain('ArtMesh192')
  expect(saved.speech?.touchBindingsVersion).toBe(13)
  await repository.configureSpeech(widget.id, {...saved.speech!, touch})
  repository.close()
  expect(
    (await open().read()).widgets.find((item) => item.id === widget.id)?.speech?.touch,
  ).toEqual(touch)
})
it('should add the coat menu once, retain another checked group, and preserve later removal', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const shrink = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!.find(
    (binding) => binding.id === 'ash:shrink',
  )!
  const saved = [{...shrink, menuActive: true, threshold: 0.95}]
  await legacy.configureSpeech(widget.id, {...DEFAULT_POFFO_SPEECH, semanticBindings: saved})
  legacy.close()
  const repository = open()
  const updated = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  expect(updated.speech?.semanticBindings?.[0]).toEqual(saved[0])
  expect(updated.speech?.semanticBindings).toHaveLength(2)
  expect(updated.speech?.semanticBindings?.[1]).toMatchObject({
    action: {id: '외투 벗기', kind: 'expression'},
    category: 'menu',
    enabled: true,
    exclusiveGroup: 'Outfit',
    id: 'ash:remove-coat',
    menuActive: false,
    menuLabel: 'Remove Coat',
  })
  expect(updated.speech).toHaveProperty('semanticBindingsVersion', 1)
  await repository.toggleWidgetAction(widget.id, 'ash:remove-coat')
  const toggled = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  expect(
    toggled.speech?.semanticBindings
      ?.filter((binding) => binding.menuActive)
      .map((binding) => binding.id),
  ).toEqual(['ash:shrink', 'ash:remove-coat'])
  await repository.configureSpeech(widget.id, {...toggled.speech!, semanticBindings: saved})
  repository.close()
  const reopened = (await open().read()).widgets.find((item) => item.id === widget.id)!
  expect(reopened.speech?.semanticBindings).toEqual(saved)
})
it('should invert existing chest Y dragging once while preserving other user settings', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const touch = {
    ...DEFAULT_POFFO_TOUCH,
    chains: [],
    enabled: false,
    parameters: {
      Param53: {axis: 'x' as const, gain: 0.6, invert: true},
      Param55: {axis: 'y' as const, gain: 0.4, invert: false},
      Param56: {axis: 'y' as const, gain: 0.7},
    },
  }
  await legacy.configureSpeech(widget.id, {...DEFAULT_POFFO_SPEECH, touch, touchBindingsVersion: 5})
  legacy.close()
  const repository = open()
  const updated = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  expect(updated.speech?.touch).toMatchObject({
    ...touch,
    chains: expect.any(Array),
    click: true,
    parameters: {
      ...touch.parameters,
      Param55: {...touch.parameters.Param55, invert: true},
      Param56: {...touch.parameters.Param56, invert: true},
      ParamAngleX: {axis: 'x', gain: 1},
      ParamAngleY: {axis: 'y', gain: 1, invert: true},
      ParamAngleZ: {axis: 'z', gain: 1},
    },
  })
  expect(updated.speech?.touchBindingsVersion).toBe(13)
  await repository.configureSpeech(widget.id, {
    ...updated.speech!,
    touch: {...updated.speech!.touch!, parameters: {Param55: {axis: 'y', invert: false}}},
  })
  repository.close()
  const reopened = (await open().read()).widgets.find((item) => item.id === widget.id)!
  expect(reopened.speech?.touch?.parameters).toEqual({Param55: {axis: 'y', invert: false}})
})
it('should add tail and chest dragging to existing Ash without restoring removed arm connections', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  await legacy.configureSpeech(widget.id, {
    ...DEFAULT_POFFO_SPEECH,
    touch: {
      ...DEFAULT_POFFO_TOUCH,
      chains: [
        {
          enabled: false,
          id: 'custom-ear',
          joints: [{id: 'ear', parameterId: 'ParamAngleX', response: 0.4}],
          name: '내 귀 연결',
        },
      ],
      enabled: true,
      inverseKinematics: true,
      parameters: {ParamAngleX: {axis: 'x', gain: 0.4}},
    },
    touchBindingsVersion: 4,
  })
  legacy.close()
  const repository = open()
  const updated = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  const chains = touchJointChains(updated.speech?.touch)
  expect(chains.slice(0, 2).map((chain) => chain.name)).toEqual(['내 귀 연결', '꼬리'])
  expect(chains[0]?.enabled).toBe(false)
  expect(chains[0]?.joints[0]?.response).toBe(0.4)
  expect(chains[1]?.joints).toHaveLength(7)
  expect(updated.speech?.touch?.parameters).toMatchObject({
    Param53: {axis: 'x'},
    Param54: {axis: 'x'},
    Param55: {axis: 'y', invert: true},
    Param56: {axis: 'y', invert: true},
    ParamAngleX: {axis: 'x', gain: 0.4},
  })
  expect(updated.speech?.touchBindingsVersion).toBe(13)
})
it('should apply both arm drags once to existing Ash while retaining other choices', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  await legacy.configureSpeech(widget.id, {
    ...DEFAULT_POFFO_SPEECH,
    touch: {
      ...DEFAULT_POFFO_TOUCH,
      parameters: {
        Param_Angle_Rotation24: {axis: 'x', invert: true},
        ParamAngleX: {axis: 'x', gain: 0.4},
      },
    },
    touchBindingsVersion: 1,
  })
  legacy.close()
  const repository = open()
  const updated = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  expect(updated.speech?.touch).toMatchObject({
    chains: expect.arrayContaining(
      [
        {
          enabled: true,
          name: '왼팔',
          parameters: {
            elbow: 'Param_Angle_Rotation22',
            shoulder: 'Param_Angle_Rotation21',
            wrist: 'Param_Angle_Rotation23',
          },
        },
        {
          enabled: true,
          name: '오른팔',
          parameters: {
            elbow: 'Param_Angle_Rotation25',
            shoulder: 'Param_Angle_Rotation24',
            wrist: 'Param_Angle_Rotation26',
          },
        },
        {enabled: true, joints: expect.any(Array), name: '꼬리'},
      ].map((chain) => expect.objectContaining(chain)),
    ),
    drag: true,
    enabled: true,
    inverseKinematics: true,
    jointResponse: {elbow: 0.6, shoulder: 0.25, wrist: 1},
    parameters: {
      Param_Angle_Rotation21: {axis: 'y'},
      Param_Angle_Rotation22: {axis: 'y'},
      Param_Angle_Rotation23: {axis: 'y'},
      Param_Angle_Rotation24: {axis: 'y'},
      Param_Angle_Rotation25: {axis: 'y'},
      Param_Angle_Rotation26: {axis: 'y'},
      ParamAngleX: {axis: 'x', gain: 0.4},
    },
  })
  expect(updated.speech?.touchBindingsVersion).toBe(13)
  expect(updated.speech?.touch?.parameters?.Param_Angle_Rotation21?.invert).toBe(true)
  expect(updated.speech?.touch?.parameters?.Param_Angle_Rotation24?.invert).toBeUndefined()
  await repository.configureSpeech(widget.id, {
    ...updated.speech!,
    touch: {...updated.speech!.touch!, enabled: false, parameters: {}},
  })
  repository.close()
  expect(
    (await open().read()).widgets.find((item) => item.id === widget.id)?.speech?.touch,
  ).toMatchObject({enabled: false, parameters: {}})
})
afterEach(async () => {
  repositories.forEach((item) => item.close())
  repositories.length = 0
  await Dexie.delete(name)
})

it('should open one Ash widget with Sora and persist its default connections across reopen', async () => {
  const repository = open()
  const snapshot = await repository.read()
  expect(snapshot.widgets).toHaveLength(1)
  const widget = snapshot.widgets[0]!
  expect(widget.assetId).toBe('builtin:ash')
  expect(widget.speech).toMatchObject({
    enabled: true,
    lipsync: {gain: 3, source: 'voice'},
    touch: {
      drag: true,
      enabled: true,
      parameters: {
        Param_Angle_Rotation21: {axis: 'y'},
        Param_Angle_Rotation24: {axis: 'y'},
        Param55: {axis: 'y', invert: true},
        Param56: {axis: 'y', invert: true},
        ParamAngleX: {axis: 'x', gain: 1},
        ParamAngleY: {axis: 'y', gain: 1, invert: true},
        ParamAngleZ: {axis: 'z', gain: 1},
      },
    },
    voice: {enabled: true, voice: 'Sora'},
  })
  expect(widget.speech?.semanticBindings).toHaveLength(29)
  expect(widget.speech).toHaveProperty('semanticBindingsVersion', 1)
  expect(widget.speech?.agentBindings?.tool).toEqual({actions: [], parameterId: null})
  repository.close()
  expect((await open().read()).widgets[0]?.speech?.semanticBindings).toEqual(
    widget.speech?.semanticBindings,
  )
})
it('should add head dragging to existing Ash without changing chest or custom connections', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const touch = {
    ...DEFAULT_POFFO_TOUCH,
    chains: [],
    enabled: true,
    parameters: {
      Param55: {axis: 'y' as const, gain: 0.7, invert: false},
      ParamAngleX: {axis: 'x' as const, gain: 0.4},
    },
  }
  await legacy.configureSpeech(widget.id, {...DEFAULT_POFFO_SPEECH, touch, touchBindingsVersion: 6})
  legacy.close()
  const repository = open()
  const updated = (await repository.read()).widgets.find((item) => item.id === widget.id)!
  expect(updated.speech?.touch).toMatchObject({
    ...touch,
    chains: expect.any(Array),
    click: true,
    parameters: {
      ...touch.parameters,
      ParamAngleY: {axis: 'y', gain: 1, invert: true},
      ParamAngleZ: {axis: 'z', gain: 1},
    },
  })
  expect(updated.speech?.touchBindingsVersion).toBe(13)
  repository.close()
  expect(
    (await open().read()).widgets.find((item) => item.id === widget.id)?.speech?.touch,
  ).toEqual(updated.speech?.touch)
})

it('should apply threefold lip sync to added Ash widgets and retain a later gain across reopen', async () => {
  const repository = open()
  const widget = await repository.addWidget('builtin:ash')
  expect(widget.speech?.lipsync).toEqual({gain: 3, source: 'voice'})
  await repository.configureSpeech(widget.id, {
    ...widget.speech!,
    lipsync: {...widget.speech!.lipsync!, gain: 0.8},
  })
  repository.close()
  expect(
    (await open().read()).widgets.find((item) => item.id === widget.id)?.speech?.lipsync?.gain,
  ).toBe(0.8)
})

it('should create the initial widget only once when repositories open concurrently', async () => {
  const first = open()
  const second = open()
  const snapshots = await Promise.all([first.read(), second.read()])
  expect(snapshots.map((snapshot) => snapshot.widgets.length)).toEqual([1, 1])
  expect(snapshots[0].widgets[0].id).toBe(snapshots[1].widgets[0].id)
})

it('should keep the widget list empty after the user closes the initial widget', async () => {
  const repository = open()
  const widget = (await repository.read()).widgets[0]!
  await repository.removeWidget(widget.id)
  repository.close()
  expect((await open().read()).widgets).toEqual([])
})

it('should retain existing widgets and their chosen voice without adding another Ash', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('custom')
  await legacy.configureSpeech(widget.id, {
    ...DEFAULT_POFFO_SPEECH,
    voice: {...DEFAULT_POFFO_SPEECH.voice!, voice: 'Hana'},
  })
  legacy.close()
  const widgets = (await open().read()).widgets
  expect(widgets).toHaveLength(1)
  expect(widgets[0]).toMatchObject({
    assetId: 'custom',
    id: widget.id,
    speech: {voice: {voice: 'Hana'}},
  })
})
it('should initialize existing Ash widgets without replacing custom bindings or an explicitly empty list', async () => {
  const legacy = createLibraryRepository(name)
  const original = await legacy.addWidget('builtin:ash')
  await legacy.configureSpeech(original.id, {enabled: false, x: 0.2, y: 0.3})
  const custom = await legacy.addWidget('builtin:ash')
  await legacy.configureConnections(custom.id, {semanticBindings: []})
  legacy.close()
  const widgets = (await open().read()).widgets
  expect(widgets.find((item) => item.id === original.id)?.speech).toMatchObject({
    enabled: false,
    semanticBindings: expect.any(Array),
    x: 0.2,
    y: 0.3,
  })
  expect(widgets.find((item) => item.id === custom.id)?.speech?.semanticBindings).toEqual([])
})
it('should use shared speech defaults for other characters without adding Ash connections', async () => {
  const widget = await open().addWidget('other')
  expect(widget.speech).toEqual(DEFAULT_POFFO_SPEECH)
})

it('should backfill Ash state actions and preserve custom or empty connections', async () => {
  const legacy = createLibraryRepository(name)
  const defaults = builtinConnectionProfile('builtin:ash')!.connections
  const original = await legacy.addWidget('builtin:ash')
  await legacy.configureConnections(original.id, {
    randomActions: defaults.randomActions,
    semanticBindings: defaults.semanticBindings,
  })
  const custom = await legacy.addWidget('builtin:ash')
  const configured = {working: {parameterId: 'Param71'}}
  await legacy.configureConnections(custom.id, {agentBindings: configured})
  const empty = await legacy.addWidget('builtin:ash')
  await legacy.configureConnections(empty.id, {agentBindings: {}})
  legacy.close()
  const widgets = (await open().read()).widgets
  expect(defaults.agentBindings?.working?.actions).toEqual([
    {id: '노트 들기', kind: 'expression'},
    {id: '필기 동작', kind: 'expression'},
  ])
  expect(widgets.find((item) => item.id === original.id)?.speech?.agentBindings).toEqual(
    defaults.agentBindings,
  )
  expect(widgets.find((item) => item.id === custom.id)?.speech?.agentBindings).toEqual(configured)
  expect(widgets.find((item) => item.id === empty.id)?.speech?.agentBindings).toEqual({})
  expect((await open().read()).widgets).toEqual(widgets)
})

it('should remove the saved default tool glasses connection while retaining menu and user preferences', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const defaults = builtinConnectionProfile('builtin:ash')!.connections
  const speech = {
    ...DEFAULT_POFFO_SPEECH,
    agentBindings: {
      ...defaults.agentBindings,
      tool: {actions: [{id: '안경', kind: 'expression' as const}], parameterId: null},
      working: {on: 0.6, parameterId: 'custom-working'},
    },
    agentBindingsVersion: undefined,
    lipsync: defaults.lipsync,
    randomActions: {enabled: true, probability: 0.37},
    semanticBindings: defaults.semanticBindings,
    semanticBindingsVersion: defaults.semanticBindingsVersion,
    touch: defaults.touch,
    touchBindingsVersion: defaults.touchBindingsVersion,
    x: 0.2,
    y: 0.3,
  }
  await legacy.configureSpeech(widget.id, speech)
  legacy.close()
  const saved = (await open().read()).widgets[0]!.speech!
  expect(saved).toEqual({
    ...speech,
    agentBindings: {...speech.agentBindings, tool: {actions: [], parameterId: null}},
    agentBindingsVersion: 1,
  })
  expect(saved.semanticBindings?.find((binding) => binding.id === 'ash:glasses')).toMatchObject({
    action: {id: '안경', kind: 'expression'},
    category: 'menu',
    enabled: true,
    menuLabel: 'Glasses',
  })
  expect((await open().read()).widgets[0]?.speech).toEqual(saved)
  const repository = open()
  const custom = {...saved.agentBindings, tool: speech.agentBindings.tool}
  await repository.configureConnections(widget.id, {agentBindings: custom})
  expect((await open().read()).widgets[0]?.speech?.agentBindings).toEqual(custom)
})
it('should migrate saved Ash parameter connections without replacing speech or tracking preferences', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  await legacy.configureSpeech(widget.id, {
    enabled: false,
    semanticBindings: [
      {
        enabled: true,
        id: 'ash:sad-tears',
        mode: 'toggle',
        parameterId: 'Param70',
        text: '조용히 울었어요',
        threshold: 0.91,
      },
    ],
    x: 0.2,
    y: 0.3,
  })
  legacy.close()
  const saved = (await open().read()).widgets[0]!
  expect(saved.speech).toMatchObject({
    enabled: false,
    semanticBindings: [
      {
        action: {id: '눈물', kind: 'expression'},
        id: 'ash:sad-tears',
        parameterId: null,
        text: '조용히 울었어요',
        threshold: 0.91,
      },
      coatMenu(),
    ],
    x: 0.2,
    y: 0.3,
  })
  expect((await open().read()).widgets[0]?.speech).toEqual(saved.speech)
})

it('should persist removal of obsolete builtin outputs while retaining random preferences across reopen', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const valid = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!.find(
    (binding) => binding.id === 'ash:notes',
  )!
  const obsolete = {...valid, action: undefined, id: 'ash:wink-left', parameterId: 'ParamEyeLOpen'}
  const draft = {...obsolete, id: 'user-draft', parameterId: null}
  await legacy.configureSpeech(widget.id, {
    enabled: true,
    randomActions: {enabled: true, probability: 0.4},
    semanticBindings: [valid, obsolete, draft],
    x: 0.2,
    y: 0.3,
  })
  legacy.close()
  const repository = open()
  const saved = (await repository.read()).widgets[0]!
  expect(saved.speech?.semanticBindings).toEqual([valid, draft, coatMenu()])
  expect(saved.speech?.randomActions).toEqual({
    enabled: true,
    probability: 0.4,
  })
  expect(saved.speech).toMatchObject({enabled: true, x: 0.2, y: 0.3})
  repository.close()
  expect((await open().read()).widgets[0]?.speech).toEqual(saved.speech)
})

it('should persist corrected contextual pose descriptions for existing widgets across reopen', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const old = semanticBindingsSchema.parse(previous)
  await legacy.configureSpeech(widget.id, {enabled: true, semanticBindings: old, x: 0.3, y: 0.4})
  legacy.close()
  const repository = open()
  const saved = (await repository.read()).widgets[0]!
  const preset = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  expect(saved.speech?.semanticBindings).toEqual([
    ...old.map((binding) => preset.find((item) => item.id === binding.id)),
    coatMenu(),
  ])
  expect(saved.speech).toMatchObject({enabled: true, x: 0.3, y: 0.4})
  repository.close()
  expect((await open().read()).widgets[0]?.speech).toEqual(saved.speech)
})

it('should persist prerequisite bundles on reopen and preserve saved settings', async () => {
  const legacy = createLibraryRepository(name)
  const widget = await legacy.addWidget('builtin:ash')
  const defaults = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  const bundled = defaults.filter((binding) =>
    ['ash:press-left', 'ash:press-right', 'ash:notes-detail'].includes(binding.id),
  )
  const saved = bundled.map((binding) => ({
    ...binding,
    action: binding.actions!.at(-1),
    actions: undefined,
    exclusiveGroup: '저장한 그룹',
    release: 'next-speech' as const,
    text: '직접 저장한 예문',
    threshold: 0.91,
  }))
  await legacy.configureSpeech(widget.id, {enabled: true, semanticBindings: saved, x: 0.2, y: 0.3})
  legacy.close()
  const migrated = (await open().read()).widgets[0]!.speech!
  expect(migrated).toMatchObject({enabled: true, x: 0.2, y: 0.3})
  expect(migrated.semanticBindings).toEqual([
    ...saved.map((binding, index) => ({
      ...binding,
      action: undefined,
      actions: bundled[index].actions,
    })),
    coatMenu(),
  ])
  expect((await open().read()).widgets[0]?.speech?.semanticBindings).toEqual(
    migrated.semanticBindings,
  )
})

it('should retain edited languages and explicit language removals across reopen', async () => {
  const repository = open()
  let widget = (await repository.read()).widgets[0]!
  const original = widget.speech!.semanticBindings![0]!
  const korean = {
    ...original.examples!.find((example) => example.language === 'ko')!,
    text: '직접 바꾼 한국어 예문',
  }
  const binding = {
    ...original,
    examples: [korean],
    excludeText: korean.excludeText,
    text: korean.text,
  }
  await repository.configureSpeech(widget.id, {...widget.speech!, semanticBindings: [binding]})
  repository.close()
  const reopened = open()
  widget = (await reopened.read()).widgets[0]!
  expect(widget.speech!.semanticBindings![0]!.examples).toEqual([korean])
  await reopened.configureSpeech(widget.id, {
    ...widget.speech!,
    semanticBindings: [{...binding, examples: [], excludeText: undefined, text: ''}],
  })
  reopened.close()
  expect((await open().read()).widgets[0]!.speech!.semanticBindings![0]!.examples).toEqual([])
})
