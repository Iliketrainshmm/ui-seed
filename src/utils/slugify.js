// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {kebabCase} = require('lodash')

module.exports = (text) => {
  return kebabCase(text.toLowerCase())
}
