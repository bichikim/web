// noinspection ES6PreferShortImport

import {HstVue} from '@histoire/plugin-vue'
import vue from '@vitejs/plugin-vue'
import {defineConfig} from 'histoire'
// import babel from 'vite-plugin-babel'
// import {histoireTree} from './scripts/histoire-tree'
// import {viteAlias} from './scripts/vite-alias'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [HstVue()],
  setupFile: 'histoire.setup.ts',
  storyMatch: ['**/*.story.vue'],
  // tree: {
  //   file: ({title, path}) => {
  //     const pathTree = histoireTree(path, {
  //       removePaths: ['src', '__stories__'],
  //       skipHeadPaths: ['packages', 'apps'],
  //     })
  //     if (pathTree.length === 0) {
  //       return title.split('/')
  //     }
  //     return pathTree
  //   },
  // },
  vite: {
    plugins: [
      //
      vue(),
      tsconfigPaths(),
    ],
    resolve: {
      alias: [
        //
      ],
    },
  },
})
