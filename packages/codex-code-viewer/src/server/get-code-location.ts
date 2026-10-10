import {type CodeLocation, type Result} from '../shared/contracts'
import {createCodeLocationReader} from './create-code-location-reader'
export const getCodeLocation = (
  root: string,
  path: string,
  offset: number,
  sources: ReadonlyMap<string, string>,
): Result<CodeLocation> => createCodeLocationReader(root, sources)(path, offset)
