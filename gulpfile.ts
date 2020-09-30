import {series, src, dest} from 'gulp'
import vinylPaths from 'vinyl-paths'
import * as execa from 'gulp-execa'
import rename from 'gulp-rename'
import del from 'del'

export const createIcons = execa.task('vue-asset-generate -a icon.png -o public/img/icons')

export const moveFavicon = () => {
  return src('public/img/icons/favicon.ico')
    .pipe(vinylPaths(del))
    .pipe(dest('public'))
}

export const moveManifest = () => {
  return src('public/img/icons/manifest.json')
    .pipe(vinylPaths(del))
    .pipe(rename((path) => {
      path.basename = 'icons'
    }))
    .pipe(dest('./'))
}

export const icons = series(createIcons, moveFavicon, moveManifest)
