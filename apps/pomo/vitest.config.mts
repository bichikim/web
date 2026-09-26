import {fileURLToPath} from 'node:url'
import {mergeConfig} from 'vite'

import {createVitestConfig, unitTestProject} from '../../vitest.base.config.mts'

const appUnitTestProject = {
  ...unitTestProject,
  test: {
    ...unitTestProject.test,
    include: [
      '__tests__/**/*.spec.?(c|m)[jt]s?(x)',
      'scripts/**/*.spec.?(c|m)[jt]s?(x)',
      'src/**/*.spec.?(c|m)[jt]s?(x)',
    ],
    setupFiles: [fileURLToPath(new URL('../../vitest.setup.ts', import.meta.url))],
  },
}

export default mergeConfig(createVitestConfig([appUnitTestProject]), {
  root: fileURLToPath(new URL('./', import.meta.url)),
})
