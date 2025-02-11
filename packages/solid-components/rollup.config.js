import withSolid from 'rollup-preset-solid'
import {fileURLToPath} from 'node:url'
import alias from '@rollup/plugin-alias'

export default withSolid([
  {
    input: 'src/index.tsx',
    plugins: [
      alias({
        entries: [
          {
            find: 'src',
            replacement: fileURLToPath(new URL('src', import.meta.url)),
          },
        ],
      }),
    ],
    targets: ['esm', 'cjs'],
  },
])
