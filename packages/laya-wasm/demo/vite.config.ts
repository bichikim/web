import {createReadStream} from 'node:fs'
import {stat} from 'node:fs/promises'
import {constants} from 'node:http2'
import {resolve, sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import UnoCSS from '@unocss/vite'
import unoConfig from '@winter-love/unocss-config'
import {type Connect, defineConfig} from 'vite'
import solid from 'vite-plugin-solid'

const modelDirectories = [
  {directory: process.env.LAYA_MODEL_DIR, prefix: '/models/laya/'},
  {directory: process.env.LAYA_MULTILINGUAL_MODEL_DIR, prefix: '/models/laya-multilingual/'},
]
const serveModels: Connect.NextHandleFunction = async (request, response, next) => {
  const {pathname} = new URL(request.url ?? '/', 'http://localhost')
  const route = modelDirectories.find(({prefix}) => pathname.startsWith(prefix))
  if (route?.directory === undefined) {
    next()
    return
  }
  const {directory, prefix} = route
  try {
    const path = resolve(directory, decodeURIComponent(pathname.slice(prefix.length)))
    if (!path.startsWith(resolve(directory) + sep)) {
      response.writeHead(constants.HTTP_STATUS_FORBIDDEN).end()
      return
    }
    const metadata = await stat(path)
    if (!metadata.isFile()) {
      response.writeHead(constants.HTTP_STATUS_NOT_FOUND).end()
      return
    }
    response.writeHead(constants.HTTP_STATUS_OK, {
      'Content-Length': metadata.size,
      'Content-Type': path.endsWith('.json') ? 'application/json' : 'application/octet-stream',
    })
    createReadStream(path).on('error', next).pipe(response)
  } catch (cause) {
    if (cause instanceof URIError) {
      response.writeHead(constants.HTTP_STATUS_BAD_REQUEST).end()
      return
    }
    if (
      cause instanceof Error &&
      'code' in cause &&
      (cause.code === 'ENOENT' || cause.code === 'ENOTDIR')
    ) {
      response.writeHead(constants.HTTP_STATUS_NOT_FOUND).end()
      return
    }
    next(cause)
  }
}

export default defineConfig({
  build: {outDir: 'dist', target: 'esnext'},
  plugins: [
    UnoCSS({
      ...unoConfig,
      configFile: false,
      shortcuts: [
        ...unoConfig.shortcuts,
        [
          'lab-card',
          'box-border min-w-0 rounded-2xl border border-solid border-slate-200 bg-white p-6',
        ],
        [
          'lab-input',
          [
            'box-border w-full rounded-lg border border-solid border-slate-300 bg-white',
            'px-3 py-2.5 text-sm leading-relaxed text-slate-900 font-inherit outline-none',
            'focus:border-teal-700 focus:ring-2 focus:ring-teal-100',
            'disabled:bg-slate-50 disabled:text-slate-500',
          ].join(' '),
        ],
        [
          'lab-button',
          [
            'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg',
            'border border-solid border-slate-300 bg-white px-4 py-2.5 text-sm font-600',
            'text-slate-800 font-inherit outline-none hover:bg-slate-50',
            'focus-visible:ring-3 focus-visible:ring-teal-500',
            'disabled:cursor-not-allowed disabled:opacity-45',
          ].join(' '),
        ],
        ['lab-primary', 'lab-button border-teal-700 bg-teal-700 text-white hover:bg-teal-800'],
        ['lab-label', 'mb-2 block text-sm font-600 text-slate-700'],
        [
          'lab-progress',
          [
            'appearance-none w-full overflow-hidden rounded-full border-0',
            'bg-slate-100 accent-teal-700 [&::-webkit-progress-bar]:bg-slate-100',
            '[&::-webkit-progress-value]:bg-teal-700 [&::-moz-progress-bar]:bg-teal-700',
          ].join(' '),
        ],
        [
          'lab-tag',
          'rounded-full border border-solid border-teal-200 bg-teal-50 px-3 py-2 text-xs font-600 text-teal-900',
        ],
        [
          'lab-error',
          [
            'mb-5 flex items-start justify-between gap-4 rounded-xl border border-solid',
            'border-red-200 bg-red-50 px-5 py-4 text-sm leading-relaxed text-red-900',
          ].join(' '),
        ],
        [
          'lab-reset',
          [
            'mt-4 cursor-pointer border-0 bg-transparent p-0 text-xs font-inherit',
            'text-slate-500 underline underline-offset-3',
            'disabled:cursor-not-allowed disabled:opacity-45',
          ].join(' '),
        ],
      ],
    }),
    solid(),
    {
      configurePreviewServer(server) {
        server.middlewares.use(serveModels)
      },
      configureServer(server) {
        server.middlewares.use(serveModels)
      },
      name: 'laya-demo-models',
    },
  ],
  preview: {host: '127.0.0.1', port: 3400, strictPort: true},
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: {host: '127.0.0.1', port: 3400, strictPort: true},
  worker: {format: 'es'},
})
