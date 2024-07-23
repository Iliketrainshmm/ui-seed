// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {format} = require('util')
const colors = require('colors/safe')
const fs = require('fs')
const path = require('path')
const {get} = require('./options')
const {getType} = require('./validate')

const c = console
const logDirectory = path.resolve(__dirname, '../../output')
const logFileName = `seed_${Date.now()}.log`
let logFilePath = path.resolve(logDirectory, logFileName)

function logToFile(...args) {
  const logToFile = get('logToFile')
  if (!logToFile) return
  if (getType(logToFile) === 'string') logFilePath = path.resolve(logToFile)
  try {
    if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory)
    fs.writeFileSync(logFilePath, `\n${format(...args)}`, {flag: 'a'})
  } catch (e) {
    c.warn(`Failed to write logs to log file. ${e.toString()}`)
  }
}

function log(writeLogToFile, ...args) {
  if (writeLogToFile) logToFile(...args)
  if (get('silent')) return
  c.log(...args)
}

/**
 * Add padding to start of values with toString method and return as string
 * @param {any} value value (with toString method) to pad
 * @param {Number} amount pad amount
 * @param {Number|String} padValue pad value
 */
function padStart(value, amount, padValue) {
  try {
    return value.toString().padStart(amount, padValue)
  } catch (e) {
    c.warn(`padStart failed: ${e.toString()}. Returning original value back.`)
    return value
  }
}

function getTimestamp() {
  const time = new Date()
  const hr = padStart(time.getHours(), 2, 0)
  const min = padStart(time.getMinutes(), 2, 0)
  const sec = padStart(time.getSeconds(), 2, 0)
  const ms = padStart(time.getMilliseconds(), 3, 0)
  return `${hr}:${min}:${sec}:${ms}`
}

function colorize(str, color) {
  const colorizer = colors[color] || colors.reset
  return colorizer(str)
}

/**
 *
 * @param {any} msg data to log (will be formatted using util.format)
 * @param {String} [color] color of msg (or of prefix, if provided)
 * @param {String} [prefix] message prefix (if provided, only prefix will be
 *  colored)
 * @param {String} [type] type of log (debug or verbose)
 */
function logger(msg, color, prefix, type) {
  const timestamp =
    type === 'throw' || get('noTs') ? '' : `[${getTimestamp()}] `
  const coloredTimestamp = colorize(timestamp, 'gray')
  const msgArray = Array.isArray(msg) ? msg : [msg]
  const msgPrefix = prefix ? `${prefix}: ` : ''

  logToFile(timestamp + msgPrefix + format(...msgArray))

  if (type === 'debug' && !get('debug')) return
  if (type === 'verbose' && !get('verbose')) return
  let logData = ''
  if (prefix) {
    const padSize = 'Success: '.length
    const logPrefix = colorize(msgPrefix.padStart(padSize), color)
    logData = coloredTimestamp + logPrefix + format(...msgArray)
  } else {
    logData = coloredTimestamp + colorize(format(...msgArray), color)
  }
  if (type === 'throw') return logData
  log(false, logData)
}

module.exports = {
  debug(...msg) {
    logger(msg, 'cyan', 'Debug', 'debug')
  },
  error(...msg) {
    if (get('strict')) this.throw(...msg)
    logger(msg, 'red', 'Error')
    log(true, new Error('trace'))
  },
  info(...msg) {
    logger(msg, 'blue', 'Info')
  },
  log: logger,
  out(...msg) {
    log(true, ...msg)
  },
  showError(...msg) {
    // show error without throwing even in strict mode
    logger(msg, 'red', 'Error')
    log(true, new Error('trace'))
  },
  success(...msg) {
    logger(msg, 'green', 'Success')
  },
  throw(...msg) {
    const coloredMsg = logger(msg, 'red', null, 'throw')
    throw new Error(coloredMsg)
  },
  verbose(...msg) {
    logger(['Verbose:', ...msg], 'gray', null, 'verbose')
  },
  warn(...msg) {
    logger(msg, 'yellow', 'Warning')
  },
}
