/* eslint-disable format/padding-line-between-statements */
/* eslint-disable @typescript-eslint/no-require-imports */
const {optimize} = require('svgo')
const {getOptions} = require('loader-utils')

module.exports = function vueSvgLoader(svg) {
  const {svgo: svgoConfig} = getOptions(this) || {}

  if (svgoConfig !== false) {
    const {data} = optimize(svg, {
      path: this.resourcePath,
      ...svgoConfig,
    })
    svg = data
  }

  return `<template>${svg}</template>`
}
