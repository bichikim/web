import {expect, test} from 'vitest'
import {findMissingCubismAssets} from '../find-missing-cubism-assets'

test('should list every absent reference with its purpose and resolved path', () => {
  const references = {
    DisplayInfo: 'avatar.cdi3.json',
    Expressions: [{File: 'expressions/smile.exp3.json', Name: 'Smile'}],
    Moc: 'avatar.moc3',
    Motions: {Idle: [{File: 'motions/idle.motion3.json', Sound: 'audio/voice.wav'}]},
    Physics: 'avatar.physics3.json',
    Pose: 'avatar.pose3.json',
    Textures: ['atlas/texture_00.png', 'atlas/texture_01.png'],
    UserData: 'avatar.userdata3.json',
  }
  const files = new Map([['model/atlas/texture_00.png', new Uint8Array()]])
  const missing = findMissingCubismAssets(files, 'model/avatar.model3.json', references)
  expect(missing).toEqual([
    '모델 데이터 (.moc3): model/avatar.moc3',
    'PNG 텍스처: model/atlas/texture_01.png',
    '물리 설정: model/avatar.physics3.json',
    '포즈 설정: model/avatar.pose3.json',
    '표시 이름: model/avatar.cdi3.json',
    '사용자 데이터: model/avatar.userdata3.json',
    '표정: model/expressions/smile.exp3.json',
    '모션: model/motions/idle.motion3.json',
    '모션 오디오: model/audio/voice.wav',
  ])
})

test('should not require absent optional metadata or warn about existing assets', () => {
  const files = new Map([
    ['avatar.moc3', new Uint8Array()],
    ['art.png', new Uint8Array()],
  ])
  expect(
    findMissingCubismAssets(files, 'avatar.model3.json', {
      Moc: 'avatar.moc3',
      Textures: ['art.png'],
    }),
  ).toEqual([])
})

test('should report missing mandatory reference fields', () => {
  expect(findMissingCubismAssets(new Map(), 'avatar.model3.json', {})).toEqual([
    '모델 데이터 (.moc3): model3.json의 FileReferences.Moc 항목',
    'PNG 텍스처: model3.json의 FileReferences.Textures 목록',
  ])
})

test('should distinguish mandatory assets from optional references', () => {
  expect(
    findMissingCubismAssets(
      new Map(),
      'avatar.model3.json',
      {
        Moc: 'avatar.moc3',
        Physics: 'hair.physics3.json',
        Textures: ['art.png'],
      },
      {requiredOnly: true},
    ),
  ).toEqual(['모델 데이터 (.moc3): avatar.moc3', 'PNG 텍스처: art.png'])
})

test('should not require external geometry or textures when converting an editor source', () => {
  expect(
    findMissingCubismAssets(
      new Map(),
      'avatar.model3.json',
      {Physics: 'hair.physics3.json'},
      {editorSource: true},
    ),
  ).toEqual(['물리 설정: hair.physics3.json'])
})

test('should reject external and escaping references instead of treating them as missing files', () => {
  expect(() =>
    findMissingCubismAssets(new Map(), 'avatar.model3.json', {
      Moc: 'https://example.com/avatar.moc3',
      Textures: [],
    }),
  ).toThrow('relative archive paths')
  expect(() =>
    findMissingCubismAssets(new Map(), 'avatar.model3.json', {Moc: '../avatar.moc3', Textures: []}),
  ).toThrow('leaves the archive')
})
