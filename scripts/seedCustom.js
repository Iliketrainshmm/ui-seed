// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {apim, apic} = require('../src')

module.exports = async () => {
  await apic.signIn('admin', '8iron-hide')
  // invoke apic methods here [i.e. await apic.getProviderOrg('steveorg')]
  await apic.signOut()

  await apim.signIn('steve', '7iron-hide')
  // invoke apim methods here [i.e. await apim.getAPIs('steveorg')]
  await apim.signOut()
}
