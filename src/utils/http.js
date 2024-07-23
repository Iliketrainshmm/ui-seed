// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.
const axios = require('axios')
const {defaultMethod, defaultTimeout} = require('../configs')
const {cleanString} = require('./string')
const {isDefined} = require('./validate')
const {sanitize} = require('./url')
const log = require('./log')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

/**
 * Send request and return promise which resolves if request was
 *  successful and reject otherwise
 * @param {Object.<string, any>} options refer to options of request.js module
 */
function send(options) {
  return new Promise((resolve, reject) => {
    axios(options)
      .then((response) => {
        const {status, data: body} = response || {}
        log.verbose({request: options, response: {status, body}})
        resolve({status:response.status, body: JSON.stringify(response.data)})
      }).catch((error) => {
        if (!error.response || !error.response.status >= 500) reject(error)
        else {
          resolve({status: error.response.status, body: JSON.stringify(error.response.data)})
        }
      })
  })
}

/**
 * Send JSON request to the url with options provided
 * @param {Object.<string, any>} options refer to options of request.js module
 * @returns a promise that always resolves with an object with properties
 *  status, error (if any), body (raw response body),
 *  jsonBody (parsed json body object)
 */
async function sendJSON({url, method, body, headers, timeout, ...options}) {
  const sanitizedURL = sanitize(url)
  log.debug(`Sending JSON request to ${sanitizedURL}`)
  const request = {
    url: sanitizedURL,
    method: method || defaultMethod,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    timeout: timeout || defaultTimeout,
    ...options,
  }
  if (isDefined(body))
    request.data = typeof body === 'string' ? body : JSON.stringify(body)
  const result = {}
  try {
    const res = await send(request)
    const {status, body: resBody} = res
    const errorData = {
      request: {
        ...request,
        headers: {...request.headers, Authorization: '...hidden'},
      },
      response: cleanString(resBody),
    }
    result.status = status
    if (status >= 500) log.throw(errorData)
    if (status >= 400) result.error = errorData
    if (resBody) {
      result.body = resBody
      try {
        result.jsonBody = JSON.parse(resBody)
      } catch (e) {
        const msg = `Server responded with non-JSON body for ${url}.`
        log.warn(msg)
        result.error = {...errorData, msg: `${msg} ${e.toString()}`}
      }
    }
  } catch (err) {
    const requestInfo = request
    requestInfo.headers.Authorization = '__OMITTED__'
    log.throw('Request failed', {request: requestInfo, err})
  }
  return result
}

module.exports = {send, sendJSON}
