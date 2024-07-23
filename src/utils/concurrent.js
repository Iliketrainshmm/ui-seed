// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {defaultLimit} = require('../configs')
const {assertRequired, assertTypes, isDefined} = require('./validate')
const log = require('./log')

/**
 * Execute multiple instance of an asynchronous method concurrently
 * @param {Function} method asynchronous method to execute
 * @param {Function} argResolver function which accepts i as an argument and
 *  returns an array of values to use as an argument for the method for ith
 *  execution (1-indexed) [Note: Return `null` or `undefined` to skip the
 *  ith execution]
 * @param {Number} times Number of times method should be executed
 * @param {Number} [limit] Maximum number of concurrent execution of the method
 */
module.exports = async (method, argResolver, times, limit) => {
  assertRequired({method, argResolver, times})
  assertTypes({method, argResolver}, 'function')
  assertTypes({times}, 'number')
  if (isDefined(limit)) assertTypes({limit}, 'number')

  const computedLimit = limit || defaultLimit
  let results = []
  let currentSet = []

  for (let i = 1; i <= times; i++) {
    const args = await argResolver(i)
    if (!isDefined(args))
      log.warn(
        `Skipping method execution ${i}. Argument resolved for method` +
          ` execution ${i} is null or undefined (utils.concurrent)`
      )
    const argsArray = Array.isArray(args) ? args : [args]
    currentSet.push(method(...argsArray))
    if (currentSet.length === computedLimit || i === times) {
      results = results.concat(await Promise.all(currentSet))
      currentSet = []
    }
  }

  return results
}
