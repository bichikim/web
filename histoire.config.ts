import {HstVue} from '@histoire/plugin-vue'
import vue from '@vitejs/plugin-vue'
import {defineConfig} from 'histoire'
// import babel from 'vite-plugin-babel'
import {histoireTree} from './scripts/histoire-tree'
import {viteAlias} from './scripts/vite-alias'

export default defineConfig({
  plugins: [HstVue()],
  setupFile: 'histoire.setup.ts',
  storyMatch: ['**/*.story.vue'],
  tree: {
    file: ({title, path}) => {
      const pathTree = histoireTree(path, {
        removePaths: ['src', '__stories__'],
        skipHeadPaths: ['packages', 'apps'],
      })
      if (pathTree.length === 0) {
        return title.split('/')
      }
      return pathTree
    },
  },
  vite: {
    plugins: [
      vue(),
      // babel({
      //   apply: 'serve',
      //   babelConfig: {
      //     babelrc: false,
      //     configFile: false,
      //     plugins: [
      //       [
      //         'module-resolver',
      //         {
      //           alias: {
      //             src: './src',
      //           },
      //           cwd: 'packagejson',
      //         },
      //       ],
      //     ],
      //     presets: [
      //       [
      //         '@babel/preset-typescript',
      //         {
      //           allExtensions: true,
      //           isTSX: true,
      //         },
      //       ],
      //     ],
      //   },
      //   filter: /\.[jt]sx?$/u,
      // }),
    ],
    resolve: {
      alias: [
        viteAlias({
          alias: 'src',
          root: __dirname,
          workspacePaths: [
            /^\/coong\/[-/._a-zA-Z0-9]+\/src\//u,
            /^\/packages\/[-/._a-zA-Z0-9]+\/src\//u,
          ],
        }),
      ],
    },
  },
})
