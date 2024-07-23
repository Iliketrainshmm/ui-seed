// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

/**
 * Replaces multiple spaces with a single space and removes new lines in `str`
 * @param {String} str string to cleanup
 */
function cleanString(str) {
  if (typeof str !== 'string') return str
  return str.replace(/\s+/g, ' ').replace(/(\\n)/g, '')
}

function getGatewayNameByType(type = 'v6') {
  const infix = type === 'v5' ? '' : 'api-'
  return `datapower-${infix}gateway`
}

module.exports = {cleanString, getGatewayNameByType}
