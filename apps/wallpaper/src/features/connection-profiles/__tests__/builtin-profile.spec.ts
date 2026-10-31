import {expect, it} from 'vitest'
import {builtinConnectionProfile} from '../builtin-profile'
import {semanticParameters} from '../../semantics/parameters'

it('should activate full smile parameters when a happy sentence just exceeds the builtin matching threshold', () => {
  const bindings = builtinConnectionProfile('builtin:ash')!.connections.semanticBindings!
  const parameters = [
    {defaultValue: 0, id: 'ParamEyeLSmile', maximum: 1, minimum: 0},
    {defaultValue: 0, id: 'ParamEyeRSmile', maximum: 1, minimum: 0},
  ]
  expect(
    semanticParameters({
      bindings,
      parameters,
      scores: {'ash:joy-left': 0.85, 'ash:joy-right': 0.85},
    }),
  ).toEqual({ParamEyeLSmile: 1, ParamEyeRSmile: 1})
  expect(
    semanticParameters({
      bindings,
      parameters,
      scores: {'ash:joy-left': 0.7, 'ash:joy-right': 0.7},
    }),
  ).toEqual({ParamEyeLSmile: 0, ParamEyeRSmile: 0})
})
