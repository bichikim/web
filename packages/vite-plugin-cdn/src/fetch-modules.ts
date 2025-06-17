import type {Module} from './types'

export type GetModule = (url: string) => Promise<Module | null>

export const fetchModules = async (
  moduleMap: Record<string, string>,
  getModule: GetModule,
): Promise<[string, string][]> => {
  const promises = Object.values(moduleMap).map((url) => getModule(url))
  const results = await Promise.all(promises)

  return Object.entries(moduleMap)
    .map(([key], index) => [key, results[index]?.text])
    .filter(([, text]) => Boolean(text)) as any
}
