import {execFileSync} from 'node:child_process'
import {appendFileSync, readFileSync} from 'node:fs'

const DEPLOY_WORKFLOW = /^\.github\/workflows\/[^/]+-deploy\.ya?ml$/u
const WORKSPACE_DIRECTORY = /^(?:apps|packages)\/[^/]+$/u
const WORKSPACE_FILE = /^(?:apps|packages)\/[^/]+\/.+/u
const BROWSER_PROJECTS = [
  ['apps/wallpaper-web', 'wallpaper-web-browser'],
  ['apps/pomo', 'pomo-album-editor-browser'],
]
const FULL_SCOPE = {
  directories: [],
  projects: ['integration', ...BROWSER_PROJECTS.map(([, project]) => project)],
}

export const selectIntegrationScope = (changedFiles, readAffectedDirectories) => {
  const inputs = changedFiles.filter((file) => !DEPLOY_WORKFLOW.test(file))
  if (inputs.length === 0) {
    return {directories: [], projects: []}
  }
  if (!inputs.every((file) => WORKSPACE_FILE.test(file))) {
    return FULL_SCOPE
  }

  const directories = new Set(readAffectedDirectories())
  if (
    ![...directories].every((directory) => WORKSPACE_DIRECTORY.test(directory)) ||
    !inputs.every((file) => directories.has(file.split('/').slice(0, 2).join('/')))
  ) {
    return FULL_SCOPE
  }

  const browserProjects = BROWSER_PROJECTS.filter(([directory]) => directories.has(directory)).map(
    ([, project]) => project,
  )
  if (directories.has('packages/oxlint-plugins')) {
    // The root integration test runs Oxlint with the workspace plugin installed.
    directories.add('__tests__')
  }
  return {directories: [...directories].sort(), projects: ['integration', ...browserProjects]}
}

const readAffectedPackages = (base, head) => {
  const {turbo} = JSON.parse(readFileSync('package.json', 'utf8')).devDependencies
  try {
    const result = execFileSync(
      'npm',
      [
        'exec',
        '--yes',
        `--package=turbo@${turbo}`,
        '--',
        'turbo',
        'ls',
        '--affected',
        '--output=json',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          TURBO_SCM_BASE: base,
          TURBO_SCM_HEAD: head,
          TURBO_TELEMETRY_DISABLED: '1',
        },
      },
    )
    return JSON.parse(result).packages.items.map(({path}) => path)
  } catch (error) {
    console.warn(
      'Could not read affected packages. Running all integration projects.',
      error.message,
    )
    return []
  }
}

if (import.meta.main) {
  const [base, head = 'HEAD'] = process.argv.slice(2)
  if (base === undefined) {
    throw new Error('Pass the pull request base commit as the first argument')
  }
  const changedFiles = execFileSync(
    'git',
    ['diff', '--name-only', '--no-renames', '-z', `${base}...${head}`, '--'],
    {encoding: 'utf8'},
  )
    .split('\0')
    .filter(Boolean)
  const scope = selectIntegrationScope(changedFiles, () => readAffectedPackages(base, head))
  console.log(JSON.stringify(scope))
  if (process.env.GITHUB_OUTPUT) {
    const required = scope.projects.length > 0
    const lines = [
      `required=${required}`,
      `projects=${JSON.stringify(scope.projects)}`,
      `directories=${JSON.stringify(scope.directories)}`,
    ]
    appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`)
  }
}
