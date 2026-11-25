import {createBuiltinLibrary, createBuiltinMedia, createBuiltinSettings} from '../builtin-assets'

export const withThemeRepositories = async <Result>(
  operation: (repositories: ReturnType<typeof openThemeRepositories>) => Promise<Result>,
): Promise<Result> => {
  const repositories = openThemeRepositories()
  try {
    return await operation(repositories)
  } finally {
    repositories.library.close()
    repositories.media.close()
    repositories.settings.close()
  }
}

const openThemeRepositories = () => ({
  library: createBuiltinLibrary('wallpaper-library'),
  media: createBuiltinMedia('wallpaper-media'),
  settings: createBuiltinSettings('wallpaper-settings'),
})

export type ThemeRepositories = ReturnType<typeof openThemeRepositories>
