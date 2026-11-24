import {cacheDirectory} from '@winter-love/model-cache'
import configuration from '../src-tauri/tauri.conf.json' with {type: 'json'}

/** Matches Tauri's application cache across worktrees and installed apps. */
export const appCacheDirectory = (options) => cacheDirectory(configuration.identifier, options)
