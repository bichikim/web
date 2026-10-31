import {expect, it} from 'vitest'
import {builtinConnectionProfile} from '../builtin-profile'
import {semanticParameters} from '../../semantics/parameters'

it('should activate full smile parameters when a happy sentence just exceeds the builtin matching threshold', () => {
  const bindings = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  const parameters = [
    {defaultValue: 0, id: 'ParamEyeLSmile', maximum: 1, minimum: 0},
    {defaultValue: 0, id: 'ParamEyeRSmile', maximum: 1, minimum: 0},
    {defaultValue: 1, id: 'ParamEyeLOpen', maximum: 2, minimum: 0},
    {defaultValue: 1, id: 'ParamEyeROpen', maximum: 2, minimum: 0},
  ]
  expect(
    semanticParameters({
      bindings,
      parameters,
      scores: {
        'ash:joy-left': 0.85,
        'ash:joy-open-left': 0.85,
        'ash:joy-open-right': 0.85,
        'ash:joy-right': 0.85,
      },
    }),
  ).toEqual({ParamEyeLOpen: 0.25, ParamEyeLSmile: 1, ParamEyeROpen: 0.25, ParamEyeRSmile: 1})
  expect(
    semanticParameters({
      bindings,
      parameters,
      scores: {
        'ash:joy-left': 0.7,
        'ash:joy-open-left': 0.7,
        'ash:joy-open-right': 0.7,
        'ash:joy-right': 0.7,
      },
    }),
  ).toEqual({ParamEyeLSmile: 0, ParamEyeRSmile: 0})
})
it('should activate both-hand transitions for notes while excluding competing props', () => {
  const bindings = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  const notes = bindings.filter(
    (binding) => binding.text === bindings.find((binding) => binding.id === 'ash:notes')!.text,
  )
  expect(
    semanticParameters({
      bindings,
      parameters: ['Param75', 'Param81', 'Param89', 'Param92', 'Param84'].map((id) => ({
        defaultValue: 0,
        id,
        maximum: 1,
        minimum: 0,
      })),
      scores: {
        ...Object.fromEntries(notes.map((binding) => [binding.id, 0.9])),
        'ash:controller': 0.85,
      },
    }),
  ).toEqual({Param75: 1, Param81: 1, Param89: 1, Param92: 1})
})
