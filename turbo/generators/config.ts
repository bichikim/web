import type {PlopTypes} from '@turbo/gen'
import cpx from 'cpx2'
import path from 'node:path'

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('new package', {
    actions: [
      //
      {
        path: 'packages/{{kebabCase name}}/package.json',
        templateFile: 'templates/package.hbs',
        type: 'add',
      },
      {
        path: 'packages/{{kebabCase name}}/vite.config.mts',
        templateFile: 'templates/vite.config.hbs',
        type: 'add',
      },
      async (answers: Record<string, any>) => {
        await new Promise((resolve) => {
          cpx.copy(
            path.join(answers.turbo.paths.root, 'turbo/generators/files/**/*'),
            path.join(answers.turbo.paths.root, `packages/${answers.name}`),
            resolve,
          )
        })
        return `/packages/${answers.name}`
      },
    ],
    description: 'create a new package',
    prompts: [
      {
        default: 'winter-love',
        message: 'What is the name of the package scope?',
        name: 'scope',
        type: 'input',
        validate: Boolean,
      },
      {
        message: 'What is the name of the package?',
        name: 'name',
        type: 'input',
        validate: Boolean,
      },
    ],
  })
}
