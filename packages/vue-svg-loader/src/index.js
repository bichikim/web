/* eslint-disable format/padding-line-between-statements */
/* eslint-disable @typescript-eslint/no-require-imports */
const {optimize} = require('svgo')

module.exports = function vueSvgLoader(svg) {
  const {svgo: svgoConfig} = this.getOptions() || {}

  let content = svg
  if (svgoConfig !== false) {
    const {data} = optimize(svg, {
      path: this.resourcePath,
      ...svgoConfig,
    })
    content = data
  }

  return `<template>${content}</template>`
}
