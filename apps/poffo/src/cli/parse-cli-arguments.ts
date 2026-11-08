import {parseArgs} from 'node:util'

export const parseCliArguments = (args: ReadonlyArray<string>) =>
  parseArgs({
    allowPositionals: true,
    args: [...args],
    options: {
      cli: {type: 'boolean'},
      directory: {type: 'string'},
      discard: {type: 'boolean'},
      file: {type: 'string'},
      fingerprint: {type: 'string'},
      format: {type: 'string'},
      gui: {type: 'boolean'},
      help: {short: 'h', type: 'boolean'},
      input: {type: 'string'},
      'input-file': {type: 'string'},
      json: {type: 'boolean'},
      'native-origin': {type: 'string'},
      overwrite: {type: 'boolean'},
      'parent-stdio': {type: 'boolean'},
      port: {type: 'string'},
      resume: {type: 'boolean'},
      revision: {type: 'string'},
      workspace: {type: 'string'},
    },
    strict: true,
  })
