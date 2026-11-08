import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'
import {resolveWorkspacePath} from '../backend/node/resolve-workspace-path'

/** Checks each shared parent before creating run files below it. */
export const prepareRecipeDirectory = async (workspace: string, identifier: string) => {
  const PRIVATE_DIRECTORY = 0o700
  await mkdir(join(workspace, '.poffo'), {mode: PRIVATE_DIRECTORY, recursive: true})
  const stateRoot = await resolveWorkspacePath(workspace, '.poffo', 'read')
  await mkdir(join(stateRoot, 'recipes'), {mode: PRIVATE_DIRECTORY, recursive: true})
  const recipesRoot = await resolveWorkspacePath(workspace, '.poffo/recipes', 'read')
  await mkdir(join(recipesRoot, identifier), {mode: PRIVATE_DIRECTORY, recursive: true})
  const directory = join('.poffo', 'recipes', identifier)
  await resolveWorkspacePath(workspace, directory, 'read')
  return directory
}
