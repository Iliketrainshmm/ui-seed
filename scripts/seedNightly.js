// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {
  apim,
  apic,
  utils: {options, log, sleep, slugify, tryCatch},
} = require('../src')
const names = require('./assets/names')
const setupAdmin = require('./assets/setupAdmin')

module.exports = async () => {
  const orgTitle = options.get('org') || 'NightlyOrg'
  const org = slugify(orgTitle)

  await setupAdmin('admin', '8iron-hide', '7iron-hide')

  options.set('strict')

  log.info('Signing into admin with admin:8iron-hide')
  let signedIn = await tryCatch(apic.signIn, 'admin', '8iron-hide')
  if (signedIn.err) log.throw('Sign in failed!')
  log.info(`Ensuring provider org ${orgTitle} does not already exist`)
  const orgRes = await tryCatch(apic.getProviderOrg, org)
  const addOrg = orgRes.err && orgRes.err.toString().includes('"status":404')
  if (!addOrg) log.throw(`${orgTitle} already exists.`)
  log.info('Checking if user "steve" is added to provider scope')
  const user = await tryCatch(apic.getUser, 'manager', 'steve')
  const addUser = user.err && user.err.toString().includes('"status":404')
  if (addUser) {
    log.info('Adding user steve')
    const userAdded = await apic.addUser(
      'manager',
      'Steve',
      'Doe',
      'steve',
      'ibmapic+steve@gmail.com',
      '7iron-hide'
    )
    if (!userAdded) log.throw('Failed to add user steve')
  } else if (user.err) log.throw(user)
  log.info(`Creating provider org ${orgTitle}`)
  const addedOrg = await apic.createProviderOrg(orgTitle, 'steve')
  if (!addedOrg) log.throw(`Failed to create provider org ${orgTitle}`)
  await apic.signOut()

  options.set('strict', false)

  log.info('Signing into manager with steve:7iron-hide')
  signedIn = await apim.signIn('steve', '7iron-hide')
  if (!signedIn) log.throw('Sign into manager with steve:7iron-hide failed')
  log.info('Creating 150 APIs')
  const apis = await apim.createAPIs(org, 150)
  log.info('Creating 30 products')
  const products = await apim.createProducts(org, 30, apis, null, false, 10)
  log.info('Creating a catalog')
  const [{name: catalog}] = await apim.createCatalogs(org, 1)
  log.info('Adding portal service to the catalog')
  await apim.addPortalService(org, catalog)
  log.info('Enabling configured gateways for catalog')
  await apim.enableConfiguredGateways(org, catalog)
  log.info('Enabling space')
  await apim.enableSpace(org, catalog)
  log.info('Creating a new space')
  const [{name: space}] = await apim.createSpaces(org, catalog, 1)
  log.info('Enabling configured gateways for the space')
  await apim.enableConfiguredGateways(org, catalog, space)
  log.info('Publishing 15 products to default space')
  await apim.publishProducts(org, products.slice(0, 15), catalog, catalog, 1)
  log.info('Publishing 15 products to added space')
  await apim.publishProducts(org, products.slice(15, 30), catalog, space, 1)
  log.info('Creating 30 consumer organizations')
  const [consumerOrg] = await apim.createConsumerOrgs(org, catalog, 30)
  log.info('Creating 30 consumer organization invites')
  for (let i = 1; i <= 30; i++) {
    const email = `Jon_Doe_${i}@testMail.ibm.com`
    await apim.inviteConsumerOrgOwner(org, catalog, email)
    await sleep(2000) // sleeping to prevent flooding the mail server
  }
  log.info(`Creating 30 apps for consumer organization ${consumerOrg.title}`)
  const [app] = await apim.createApps(org, catalog, null, consumerOrg.name, 30)
  log.info(`Subscribing published products to app ${app.title}`)
  const publishedProducts = await apim.getProducts(org, catalog)
  await apim.subscribeProductsToApp(org, catalog, app, publishedProducts)
  await apim.createAPIs(org, 100, names)
  log.success(`Seeding completed for provider org ${orgTitle} with user steve`)
}
