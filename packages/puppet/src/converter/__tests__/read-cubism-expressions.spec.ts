import {strToU8} from 'fflate'
import {expect, test} from 'vitest'
import {createCubismArchive} from '../read-cubism-archive'
import {readCubismExpressions} from '../read-cubism-expressions'

test('should import expression hotkeys associated with this model and retain explicit names', () => {
  const archive = createCubismArchive(
    new Map([
      [
        'model/avatar.vtube.json',
        strToU8(
          JSON.stringify({
            FileReferences: {Model: 'avatar.model3.json'},
            Hotkeys: [
              {Action: 'ToggleExpression', File: 'off.exp3.json', Name: 'Signatures off'},
              {Action: 'ToggleExpression', File: 'smile.exp3.json', Name: 'Smile'},
              {Action: 'ArtMeshColorPreset', File: '', Name: 'Bald'},
            ],
          }),
        ),
      ],
    ]),
  )
  expect(
    readCubismExpressions(archive, 'model/avatar.model3.json', [
      {File: 'off.exp3.json', Name: 'Custom off'},
    ]),
  ).toEqual([
    {File: 'off.exp3.json', Name: 'Custom off'},
    {File: 'smile.exp3.json', Name: 'Smile'},
  ])
})

test('should ignore a VTube configuration pointing at another model', () => {
  const archive = createCubismArchive(
    new Map([
      [
        'avatar.vtube.json',
        strToU8(
          JSON.stringify({
            FileReferences: {Model: 'other.model3.json'},
            Hotkeys: [{Action: 'ToggleExpression', File: 'wrong.exp3.json', Name: 'Wrong'}],
          }),
        ),
      ],
    ]),
  )
  expect(readCubismExpressions(archive, 'avatar.model3.json', [])).toEqual([])
})

test('should retain missing expression references so the converter can warn about them', () => {
  const archive = createCubismArchive(
    new Map([
      [
        'avatar.vtube.json',
        strToU8(
          JSON.stringify({
            FileReferences: {Model: 'avatar.model3.json'},
            Hotkeys: [{Action: 'ToggleExpression', File: 'missing.exp3.json', Name: 'Missing'}],
          }),
        ),
      ],
    ]),
  )
  expect(readCubismExpressions(archive, 'avatar.model3.json', [])).toEqual([
    {File: 'missing.exp3.json', Name: 'Missing'},
  ])
})

test('should preserve declared expressions when no VTube configuration exists', () => {
  expect(
    readCubismExpressions(createCubismArchive(new Map()), 'avatar.model3.json', [
      {File: 'smile.exp3.json', Name: 'Smile'},
    ]),
  ).toEqual([{File: 'smile.exp3.json', Name: 'Smile'}])
})

test('should retain explicit names while distinguishing a conflicting hotkey name', () => {
  const archive = createCubismArchive(
    new Map([
      [
        'avatar.vtube.json',
        strToU8(
          JSON.stringify({
            FileReferences: {Model: 'avatar.model3.json'},
            Hotkeys: [{Action: 'ToggleExpression', File: 'other.exp3.json', Name: 'Face'}],
          }),
        ),
      ],
    ]),
  )
  expect(
    readCubismExpressions(archive, 'avatar.model3.json', [{File: 'face.exp3.json', Name: 'Face'}]),
  ).toEqual([
    {File: 'face.exp3.json', Name: 'Face'},
    {File: 'other.exp3.json', Name: 'Face (2)'},
  ])
})
