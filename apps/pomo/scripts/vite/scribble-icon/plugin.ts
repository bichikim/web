import type {Plugin} from 'vite'

interface ScribbleIconRestartOptions {
  readonly iconSetPath: string
}

/** Restarts the development server after the custom scribble icon set changes. */
export const createScribbleIconRestartPlugin = (options: ScribbleIconRestartOptions): Plugin => ({
  configureServer(server) {
    const restartServer = (changedPath: string) => {
      if (changedPath !== options.iconSetPath) {
        return
      }

      server.config.logger.info('scribble.json changed, restarting server...')
      server.restart().catch((error: unknown) => {
        const restartError = error instanceof Error ? error : new Error(String(error))
        server.config.logger.error('Failed to reload the scribble icon set.', {
          error: restartError,
        })
      })
    }

    server.watcher.add(options.iconSetPath)
    server.watcher.on('change', restartServer)
  },
  name: 'restart-on-scribble-icon-change',
})
