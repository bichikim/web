import {series, parallel} from 'gulp'
import * as execa from 'gulp-execa'

interface CreateTsOptions {
  assumeChangesOnlyAffectDirectDependencies?: boolean
  emitDeclarationOnly?: boolean
  watch?: boolean
}

export const createTS = (options: CreateTsOptions = {}) => {
  const {
    assumeChangesOnlyAffectDirectDependencies,
    emitDeclarationOnly,
    watch,
  } = options
  const script = ['ttsc --module es2020']

  if (watch) {
    script.push('--watch')
  }

  if (emitDeclarationOnly) {
    script.push('--emitDeclarationOnly')
  }

  if (assumeChangesOnlyAffectDirectDependencies) {
    script.push('--assumeChangesOnlyAffectDirectDependencies')
  }

  return execa.task(script.join(' '))
}

export const devTS = createTS({assumeChangesOnlyAffectDirectDependencies: true, watch: true})

export const buildTs = createTS({assumeChangesOnlyAffectDirectDependencies: true, watch: false, emitDeclarationOnly: true})

export const buildRollup = execa.task('rollup -c')
