// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {parse} = require('url')

/**
 * Get query from url
 * @param {String} url full url with protocol, domain, path, etc.
 * @param {String} query name of the query
 */
function getQuery(url, query) {
  const parsedUrl = parse(url, true)
  const queries = parsedUrl.query
  return queries[query]
}

/**
 * Get path from url
 * @param {String} url full url with protocol, domain, path, etc.
 */
function getPath(url) {
  const parsedUrl = parse(url)
  return parsedUrl.pathname
}

/**
 * Removes trailing slash and replaces `///` with `//`
 * @param {String} url url to sanitize
 */
function sanitize(url) {
  return url.replace(/([^:]\/)\/+/g, '$1').replace(/\/$/, '')
}

function getAPIEndpoint(url) {
  if (typeof url !== 'string') return
  return `/api/${url.split('/api/')[1]}`
}

module.exports = {getAPIEndpoint, getPath, getQuery, sanitize}
