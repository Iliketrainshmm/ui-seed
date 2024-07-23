// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

/**
 * try and catch an asynchronous function and return an object with prop `err`
 *  on failure or an object with prop res on success
 * @param {function} fn an asynchronous function which may throw an error
 * @param  {...any} [args] arguments for the function
 */
async function tryCatch(fn, ...args) {
  try {
    const res = await fn(...args)
    return {res}
  } catch (err) {
    return {err}
  }
}

module.exports = tryCatch
