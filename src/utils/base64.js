// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

module.exports = {
  /**
   * @param {String} str
   */
  decode: str => {
    return Buffer.from(str, 'base64').toString('ascii')
  },

  /**
   * @param {String} str
   */
  encode: str => {
    return Buffer.from(str).toString('base64')
  },
}
