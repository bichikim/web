import {strToU8, zipSync} from 'fflate'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player/create-demo-document'
import {convertCmo3} from '../convert-cmo3'
import {convertMoc3} from '../convert-moc3'
import {convertCubismArchive} from '../convert-cubism-archive'
import {parseDocumentValue} from '../../player/parse-document'
import {encodeWav} from '../../player/audio/__tests__/support/encode-wav'
import {readCubismTexture} from '../read-cubism-texture'

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
  const converted = convertCubismArchive(zipSync(withoutPhysics))
  expect(converted.warnings).toContain('선택 파일 누락: 물리 설정: model/physics.json')
  expect(converted.document.physics).toBeUndefined()
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
  const missingAudio = convertCubismArchive(zipSync(entries))
  expect(missingAudio.warnings).toContain('선택 파일 누락: 모션 오디오: model/sounds/voice.wav')
  expect(missingAudio.document.motions[0]?.sound).toBeUndefined()
  expect(missingAudio.document.motions[0]?.tracks.length).toBeGreaterThan(0)
})

test('should warn about absent optional files while retaining available expressions and motions', () => {
  const entries = fixture()
  const model = JSON.parse(new TextDecoder().decode(entries['model/avatar.model3.json']))
  model.FileReferences.DisplayInfo = 'missing.cdi3.json'
  model.FileReferences.Physics = 'missing.physics3.json'
  model.FileReferences.Pose = 'missing.pose3.json'
  model.FileReferences.UserData = 'missing.userdata3.json'
  model.FileReferences.Expressions = [
    {File: 'missing.exp3.json', Name: 'missing'},
    {File: 'smile.exp3.json', Name: 'smile'},
  ]
  model.FileReferences.Motions.Idle.push({File: 'missing.motion3.json'})
  const {document, warnings} = convertCubismArchive(
    zipSync({
      ...entries,
      'model/avatar.model3.json': strToU8(JSON.stringify(model)),
      'model/smile.exp3.json': strToU8('{"Parameters":[{"Id":"p","Value":0.5}]}'),
    }),
  )
  expect(parseDocumentValue(document).ok).toBe(true)
  expect(document.expressions?.map((expression) => expression.id)).toEqual(['smile'])
  expect(document.motions.map((motion) => motion.id)).toEqual(['Idle:0'])
  expect(document.physics).toBeUndefined()
  expect(document.poseGroups).toBeUndefined()
  expect(document.parts[0]?.userData).toBeUndefined()
  expect(warnings).toEqual([
    '선택 파일 누락: 물리 설정: model/missing.physics3.json',
    '선택 파일 누락: 포즈 설정: model/missing.pose3.json',
    '선택 파일 누락: 표시 이름: model/missing.cdi3.json',
    '선택 파일 누락: 사용자 데이터: model/missing.userdata3.json',
    '선택 파일 누락: 표정: model/missing.exp3.json',
    '선택 파일 누락: 모션: model/missing.motion3.json',
  ])
})

test('should convert a MOC3 and texture ZIP without model3.json', () => {
  const png = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/qV8AAAAASUVORK5CYII=',
      'base64',
    ),
  )
  vi.mocked(convertMoc3).mockReturnValue({document: createDemoDocument(), warnings: []})
  const result = convertCubismArchive(
    zipSync({
      '__MACOSX/nested/._avatar.moc3': Uint8Array.of(2),
      'nested/atlas/texture_00.png': png,
      'nested/atlas/texture_01.png': png,
      'nested/atlas/texture_02.png': png,
      'nested/avatar.moc3': Uint8Array.of(1),
    }),
  )
  expect(result.document.parts.length).toBeGreaterThan(0)
  expect(convertMoc3).toHaveBeenLastCalledWith(Uint8Array.of(1), {
    textures: Array.from({length: 3}, () => readCubismTexture(png)),
  })
})

test('should convert a VTube expression omitted from model3.json with its blend mode', () => {
  const entries = fixture()
  const {document} = convertCubismArchive(
    zipSync({
      ...entries,
      'model/avatar.vtube.json': strToU8(
        JSON.stringify({
          FileReferences: {Model: 'avatar.model3.json'},
          Hotkeys: [
            {Action: 'ToggleExpression', File: 'signatures.exp3.json', Name: 'Signatures off'},
          ],
        }),
      ),
      'model/signatures.exp3.json': strToU8('{"Parameters":[{"Blend":"Add","Id":"p","Value":-1}]}'),
    }),
  )
  expect(document.expressions).toEqual([
    {
      composition: 'cubism',
      fadeInTime: 1,
      fadeOutTime: 1,
      id: 'Signatures off',
      parameters: [{blend: 'add', parameterId: 'p', value: -1}],
    },
  ])
})

test('should retain distinct expression files with duplicate hotkey names', () => {
  const {document} = convertCubismArchive(
    zipSync({
      ...fixture(),
      'model/avatar.vtube.json': strToU8(
        JSON.stringify({
          FileReferences: {Model: 'avatar.model3.json'},
          Hotkeys: [
            {Action: 'ToggleExpression', File: 'first.exp3.json', Name: 'Face'},
            {Action: 'ToggleExpression', File: 'second.exp3.json', Name: 'Face'},
            {Action: 'ToggleExpression', File: 'third.exp3.json', Name: 'Face (2)'},
          ],
        }),
      ),
      'model/first.exp3.json': strToU8('{"Parameters":[{"Id":"p","Value":1}]}'),
      'model/second.exp3.json': strToU8('{"Parameters":[{"Id":"p","Value":-1}]}'),
      'model/third.exp3.json': strToU8('{"Parameters":[]}'),
    }),
  )
  expect(document.expressions?.map((expression) => expression.id)).toEqual([
    'Face',
    'Face (3)',
    'Face (2)',
  ])
  expect(
    document.expressions?.slice(0, 2).map((expression) => expression.parameters[0]?.value),
  ).toEqual([1, -1])
})

test.each(['-0.77411', '1', '1e-2'])('should import a numeric expression string %s', (value) => {
  const {document, warnings} = convertCubismArchive(
    zipSync({
      ...fixture(),
      'model/avatar.vtube.json': strToU8(
        JSON.stringify({
          FileReferences: {Model: 'avatar.model3.json'},
          Hotkeys: [{Action: 'ToggleExpression', File: 'face.exp3.json', Name: 'Face'}],
        }),
      ),
      'model/face.exp3.json': strToU8(JSON.stringify({Parameters: [{Id: 'p', Value: value}]})),
    }),
  )
  expect(document.expressions?.[0]?.parameters[0]?.value).toBe(Number(value))
  expect(warnings).toContain('표정의 숫자 문자열을 숫자로 정규화했습니다.')
})

test.each(['', ' ', 'bad', 'Infinity', '0x10', '1e999'])(
  'should reject an invalid expression string %j',
  (value) => {
    expect(() =>
      convertCubismArchive(
        zipSync({
          ...fixture(),
          'model/avatar.vtube.json': strToU8(
            JSON.stringify({
              FileReferences: {Model: 'avatar.model3.json'},
              Hotkeys: [{Action: 'ToggleExpression', File: 'face.exp3.json', Name: 'Face'}],
            }),
          ),
          'model/face.exp3.json': strToU8(JSON.stringify({Parameters: [{Id: 'p', Value: value}]})),
        }),
      ),
    ).toThrow('number')
  },
)

test('should report all missing referenced files before attempting model conversion', () => {
  vi.mocked(convertMoc3).mockClear()
  const manifest = {
    FileReferences: {
      Expressions: [{File: 'smile.exp3.json', Name: 'smile'}],
      Moc: 'avatar.moc3',
      Physics: 'avatar.physics3.json',
      Textures: ['texture_00.png', 'texture_01.png'],
    },
    Version: 3,
  }
  expect(() =>
    convertCubismArchive(zipSync({'nested/avatar.model3.json': strToU8(JSON.stringify(manifest))})),
  ).toThrow(
    [
      '모델 데이터 (.moc3): nested/avatar.moc3',
      'PNG 텍스처: nested/texture_00.png',
      'PNG 텍스처: nested/texture_01.png',
      '물리 설정: nested/avatar.physics3.json',
      '표정: nested/smile.exp3.json',
    ].join('\n'),
  )
  expect(convertMoc3).not.toHaveBeenCalled()
})
