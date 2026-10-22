import {strToU8, zipSync} from 'fflate'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player/create-demo-document'
import {convertCmo3} from '../convert-cmo3'
import {convertMoc3} from '../convert-moc3'
import {convertCubismArchive} from '../convert-cubism-archive'
import {parseDocumentValue} from '../../player/parse-document'
import {encodeWav} from '../../player/audio/__tests__/support/encode-wav'

vi.mock('../convert-cmo3', () => ({convertCmo3: vi.fn()}))
vi.mock('../convert-moc3', () => ({convertMoc3: vi.fn()}))

const fixture = () => {
  const demo = createDemoDocument()
  const [first, second, third] = demo.parts
  const partNode = (id: string) => ({
    id,
    kind: 'part' as const,
    locked: false,
    name: id,
    visible: true,
  })
  vi.mocked(convertCmo3).mockReturnValue({
    document: {
      ...demo,
      motions: [],
      parameterBindings: [],
      parameters: [
        {defaultValue: 0, id: 'p', maximum: 1, minimum: -1, name: 'P'},
        {defaultValue: 0, id: 'q', maximum: 1, minimum: -1, name: 'Q'},
      ],
      scene: {
        roots: [
          {
            children: [partNode(first!.id)],
            id: 'ArmA',
            kind: 'group',
            locked: false,
            name: 'Arm A',
            visible: true,
          },
          {
            children: [partNode(second!.id)],
            id: 'ArmB',
            kind: 'group',
            locked: false,
            name: 'Arm B',
            visible: true,
          },
          partNode(third!.id),
        ],
      },
    },
    warnings: [],
  })
  const range = {Default: 0, Maximum: 10, Minimum: -10}
  return {
    'model/avatar.model3.json': strToU8(
      JSON.stringify({
        FileReferences: {
          DisplayInfo: 'display.json',
          Moc: 'avatar.moc3',
          Motions: {Idle: [{FadeInTime: 0.5, File: 'idle.motion3.json'}]},
          Physics: 'physics.json',
          Pose: 'pose.json',
          Textures: [],
          UserData: 'data.json',
        },
        Groups: [{Ids: ['p'], Name: 'EyeBlink', Target: 'Parameter'}],
        HitAreas: [{Id: first!.id, Name: 'Body'}],
        Version: 3,
      }),
    ),
    'model/data.json': strToU8(
      JSON.stringify({UserData: [{Id: first!.id, Target: 'ArtMesh', Value: 'body'}]}),
    ),
    'model/display.json': strToU8(
      JSON.stringify({
        ParameterGroups: [{GroupId: '', Id: 'face', Name: 'Face'}],
        Parameters: [{GroupId: 'face', Id: 'p', Name: 'Eye'}],
      }),
    ),
    'model/idle.motion3.json': strToU8(
      JSON.stringify({
        Curves: [{Id: 'ArmB', Segments: [0, 0, 0, 1.003, 1], Target: 'PartOpacity'}],
        Meta: {Duration: 1, Fps: 30, Loop: true},
        Version: 3,
      }),
    ),
    'model/physics.json': strToU8(
      JSON.stringify({
        Meta: {EffectiveForces: {Gravity: {X: 0, Y: -1}, Wind: {X: 0, Y: 0}}},
        PhysicsSettings: [
          {
            Id: 'hair',
            Input: [
              {Reflect: false, Source: {Id: 'p', Target: 'Parameter'}, Type: 'X', Weight: 60},
            ],
            Normalization: {Angle: range, Position: range},
            Output: [
              {
                Destination: {Id: 'q', Target: 'Parameter'},
                Reflect: false,
                Scale: 1.5,
                Type: 'Angle',
                VertexIndex: 1,
                Weight: 100,
              },
            ],
            Vertices: [{Radius: 0}, {Acceleration: 1.5, Delay: 0.8, Mobility: 0.9, Radius: 3}],
          },
        ],
        Version: 3,
      }),
    ),
    'model/pose.json': strToU8(
      JSON.stringify({FadeInTime: 0.5, Groups: [[{Id: 'ArmA'}, {Id: 'ArmB'}]]}),
    ),
    'model/source.cmo3': Uint8Array.of(1, 2, 3),
  }
}

test('should convert referenced SDK metadata, motion, physics and pose into a valid Poffo document', () => {
  const {document} = convertCubismArchive(zipSync(fixture()))
  expect(parseDocumentValue(document).ok).toBe(true)
  expect(document.motions[0]).toMatchObject({
    duration: 1,
    fadeInTime: 0.5,
    group: 'Idle',
    id: 'Idle:0',
  })
  expect(document.motions[0]!.tracks[0]!.keyframes.at(-1)!.time).toBe(1)
  expect(document.physics?.chains?.[0]).toMatchObject({
    inputs: [{weight: 0.6}],
    outputs: [{pendulumIndex: 0, scale: 1.5}],
  })
  expect(document.physics?.fps).toBe(0)
  expect(document.poseGroups?.[0]).toMatchObject({sourceParameterIds: ['ArmA', 'ArmB']})
  expect(document.parameterRoles).toEqual({eyeBlink: ['p']})
  expect(document.parameters?.find((parameter) => parameter.id === 'p')).toMatchObject({
    groupId: 'face',
    name: 'Eye',
  })
  expect(document.hitAreas?.[0]).toMatchObject({id: 'Body'})
  expect(document.parts[0]?.userData).toBe('body')
})

test('should convert a runtime archive without an editor source and retain its motions and metadata', () => {
  const entries = fixture()
  const {'model/source.cmo3': omitted, ...runtime} = entries
  expect(omitted).toBeDefined()
  vi.mocked(convertMoc3).mockReturnValue(vi.mocked(convertCmo3).mock.results.at(-1)!.value)
  const document = convertCubismArchive(
    zipSync({...runtime, 'model/avatar.moc3': Uint8Array.of(77, 79, 67, 51)}),
  ).document
  expect(document.motions[0]?.id).toBe('Idle:0')
  expect(document.parameterRoles).toEqual({eyeBlink: ['p']})
  expect(convertMoc3).toHaveBeenCalledWith(Uint8Array.of(77, 79, 67, 51), {textures: []})
})

test('should reject missing or external asset references', () => {
  const entries = fixture()
  const {'model/source.cmo3': omitted, ...runtime} = entries
  expect(omitted).toBeDefined()
  expect(() => convertCubismArchive(zipSync(runtime))).toThrow('avatar.moc3')
  const {'model/physics.json': missingPhysics, ...withoutPhysics} = entries
  expect(missingPhysics).toBeDefined()
  expect(() => convertCubismArchive(zipSync(withoutPhysics))).toThrow('physics.json')
  const model = JSON.parse(new TextDecoder().decode(entries['model/avatar.model3.json']))
  model.FileReferences.Physics = 'https://example.com/model.json'
  expect(() =>
    convertCubismArchive(
      zipSync({...entries, 'model/avatar.model3.json': strToU8(JSON.stringify(model))}),
    ),
  ).toThrow('relative archive paths')
})

test('should embed motion audio and convert the model layout in a portable document', () => {
  const entries = fixture()
  const model = JSON.parse(new TextDecoder().decode(entries['model/avatar.model3.json']))
  model.Layout = {height: 1, x: 0.2, y: -0.3}
  model.FileReferences.Motions.Idle[0].Sound = 'sounds/voice.wav'
  entries['model/avatar.model3.json'] = strToU8(JSON.stringify(model))
  const sound = encodeWav({channels: [[0, 0.5, -0.5]], sampleRate: 8000})
  const {document} = convertCubismArchive(
    zipSync({
      ...entries,
      'model/avatar.model3.json': strToU8(JSON.stringify(model)),
      'model/sounds/voice.wav': sound,
    }),
  )
  expect(document.motions[0]!.sound?.src).toBe(
    `data:audio/wav;base64,${Buffer.from(sound).toString('base64')}`,
  )
  expect(document.motions[0]!.sound).toMatchObject({analysis: 'rms', volume: 'source'})
  expect(document.motionParameterPrecision).toBe('float32')
  expect(document.layout).toMatchObject({
    height: document.viewport.height * 2,
    width: document.viewport.width * 2,
  })
  expect(parseDocumentValue(document).ok).toBe(true)
  expect(() => convertCubismArchive(zipSync(entries))).toThrow('voice.wav')
})
