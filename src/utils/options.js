// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {program} = require('commander')
const {assertRequired, isDefined} = require('./validate')
const {HOST_TYPES} = require('./constants')

program.option(
  '-c, --config <path>',
  'path to config file (for "seedConfig" and "seedX")'
)
program.option('-d, --debug', 'show debug output in console')
program.option('-i, --strict', 'throw error instead of just logging error')
program.option(
  '-l, --logToFile [logFile]',
  'write logs to a file. Default: output/seed_{timestamp}.log'
)
program.option(
  '-o, --org <title>',
  'provide title for provider org (only works for "seedNightly")'
)
program.option('-q, --silentRetry', 'Disable logging errors for each retry')
program.option('-s, --silent', 'disable logging to console')
program.option(
  '-r, --retries <retries>',
  'number of times to retry requests on server failures'
)
program.option('-t, --noTs', 'disable timestamp prefix in console logging')
program.option(
  '-u, --useAPIHost',
  'use "API_HOST" env variable even if cluster and namespace is provided'
)
program.option('-v, --verbose', 'show verbose output in console')
program.option('-x, --http', 'Use "http" instead of "https" for API host')
program.option('--no-color', 'disable colors in console logging')

const hostOptionsList = HOST_TYPES.join(', ')
program.option(
  '--useHostOptions',
  `use hosts provided in options ${hostOptionsList}`
)

program.option(
  '-b, --baseHost <baseHost>',
  'provide the base host to have unspecified hosts auto computed'
)

const hostOptionRequirement = 'Used in conjunction with useHostOptions option'
HOST_TYPES.forEach(type => {
  const hostInfo = `URL for ${type}. ${hostOptionRequirement}`
  program.option(`--${type} <url>`, hostInfo)
})

program.parse(process.argv)

/**
 * Get the value of a flag by it's name
 * @param {String} name name of the flag
 * @returns {Boolean|String} value of the flag
 */
function get(name) {
  assertRequired({name})
  return program[name]
}

/**
 * Remove a previously set flag
 * @param {String} name name of the flag
 */
function remove(name) {
  assertRequired({name})
  return delete program(name)
}

/**
 * Set the value for a flag
 * @param {String} name name of the flag (i.e. debug)
 * @param {Boolean|String} [value] state of the flag [default: true]
 */
function set(name, value) {
  assertRequired({name})
  program[name] = isDefined(value) ? value : true
}

/**
 * Returns string representation of options currently set
 */
function toString() {
  return JSON.stringify(program.opts())
}

module.exports = {get, remove, set, toString}
