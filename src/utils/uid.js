// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

module.exports = () => {
  return Math.random()
    .toString(36)
    .toUpperCase()
    .substr(2, 9)
}
