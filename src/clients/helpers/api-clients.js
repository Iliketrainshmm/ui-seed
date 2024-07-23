// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {
  options: {get: getOption},
  http: {sendJSON},
  log,
  retry,
  storage: {get},
  validate: {assertRequired, assertValues},
} = require('../../utils')
const getHost = require('./get-host')

/**
 * send an api request to an endpoint of admin app
 * @param {String} endpoint target api endpoint for JSON request
 * @param {String} method request method (default: `defaultMethod` in
 *  `seed/clients/config.js`)
 * @param {Object.<string, any>} body request body object
 * @param {Object.<string, any>} headers request headers (`Authorization`
 *  is included by default)
 * @param {Number} [retries] number of times to retry a request in the case of
 *  server error (default: 1)
 */
async function sendAdmin(endpoint, method, body, headers, retries) {
  const options = {headers, body, method}
  const res = await sendRequest('admin', endpoint, options, {}, retries)
  return !res.error && res.body
}

/**
 * send an api request to an endpoint of consumer app
 * @param {String} endpoint target api endpoint for JSON request
 * @param {String} method request method (default: `defaultMethod` in
 *  `seed/clients/config.js`)
 * @param {String} providerOrg name or id of provider Org (required for setting X-IBM-Consumer-Context header)
 * @param {String} catalog name or id of catalog (required for setting X-IBM-Consumer-Context header)
 * @param {Object.<string, any>} body request body object
 * @param {Object.<string, any>} headers request headers (`Authorization`
 *  is included by default)
 * @param {Number} [retries] number of times to retry a request in the case of
 *  server error (default: 1)
 */
 async function sendConsumer(endpoint, method, providerOrg, catalog, body, headers = {}, retries) {
  assertRequired({providerOrg, catalog})
  headers['X-IBM-Consumer-Context'] = `${providerOrg}.${catalog}`
  const options = {headers, body, method}
  const res = await sendRequest('consumer', endpoint, options, {}, retries)
  return !res.error && res.body
}

/**
 * send an api request to an endpoint of manager app
 * @param {String} endpoint target api endpoint for JSON request
 * @param {String} method request method (default: `defaultMethod` in
 *  `seed/clients/config.js`)
 * @param {Object.<string, any>} body request body object
 * @param {Object.<string, any>} headers request headers (`Authorization`
 *  is included by default)
 * @param {Number} [retries] number of times to retry a request in the case of
 *  server error (default: 1)
 */
async function sendManager(endpoint, method, body, headers, retries, logError = true) {
  const options = {headers, body, method}
  const res = await sendRequest('manager', endpoint, options, {}, retries, logError)
  return !res.error && res.body
}

/**
 * Send a request to an endpoint of an app with options provided and
 *  `Authorization` token stored from signIn method as a request header.
 * @param {String} app target app (admin or manager or consumer)
 * @param {String} endpoint target api endpoint for JSON request
 * @param {Object.<string, any>} [options] request options. Refer to request.js
 *  module docs for options
 * @param {Object} [flags] flags
 * @param {Boolean} [flags.skipAuth] skip the check to see if user is
 *  signed in (used for endpoints which do not requires signing in)
 * @param {Number} [retries] number of times to retry a request in the case of
 *  server error (default: 1)
 */
async function sendRequest(app, endpoint, options, flags, retries, logError = true) {
  assertRequired({app, endpoint})
  assertValues({app}, ['admin', 'manager', 'consumer'])
  const host = await getHost(app)
  const defaultRetries = parseInt(getOption('retries')) || 1
  if (!host) log.throw(`API host cannot be resolved for ${app} app`)
  const token = get(`token:${app}`)
  const {skipAuth} = flags || {}
  if (!token && !skipAuth)
    log.throw(
      `You must sign in before making an API request to ${app} app` +
        ' or use flag "skipAuth" to send request without signing in'
    )
  const url = `${host}${endpoint}`
  const authHeader = skipAuth ? {} : {Authorization: `Bearer ${token}`}
  const {headers = {}, ...requestOptions} = options || {}
  const {error, jsonBody, retryErrors, status} = await retry(
    retries || defaultRetries,
    sendJSON,
    3000,
    {url, headers: {...authHeader, ...headers}, ...requestOptions}
  )
  if (logError) {
    if (retryErrors || error) log.error('request failed:', {retryErrors, error})
  }
  return {body: jsonBody, error, retryErrors, status}
}

async function sendRequestToURL(url, method, app, flags, retries) {
  const options = {method}
  assertRequired({url})
  const host = await getHost(app)
  const defaultRetries = parseInt(getOption('retries')) || 1
  if (!host) log.throw(`API host cannot be resolved for ${app} app`)
  const token = get(`token:${app}`)
  const {skipAuth} = flags || {}
  if (!token && !skipAuth)
    log.throw(
      `You must sign in before making an API request to ${app} app` +
        ' or use flag "skipAuth" to send request without signing in'
    )
  const authHeader = skipAuth ? {} : {Authorization: `Bearer ${token}`}
  const {headers = {}, ...requestOptions} = options || {}
  const {error, jsonBody, retryErrors, status} = await retry(
    retries || defaultRetries,
    sendJSON,
    3000,
    {url, headers: {...authHeader, ...headers}, ...requestOptions}
  )
  if (retryErrors || error) log.error('request failed:', {retryErrors, error})
  return {body: jsonBody, error, retryErrors, status}
}

module.exports = {
  sendAdmin,
  sendConsumer,
  sendManager,
  sendRequest,
  sendRequestToURL,
}
