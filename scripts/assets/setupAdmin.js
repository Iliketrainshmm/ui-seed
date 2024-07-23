const {
  apic,
  utils: {
    options,
    log,
    tryCatch,
    validate: {assertTypes, isDefined},
  },
} = require('../../src')

function alreadyAdded(error) {
  const err = (error && error.toString()) || ''
  if (err.includes('"status":400') || err.includes('"status":409')) return true
}

module.exports = async (
  username,
  password,
  secondaryPassword,
  adminEmail,
  mailServer,
  gatewayType
) => {
  assertTypes({username, password}, 'string')
  if (isDefined(secondaryPassword))
    assertTypes({secondaryPassword}, 'string')

  options.set('strict')

  log.info(`Signing into admin with ${username}:${password}`)
  let signedIn = await tryCatch(apic.signIn, username, password)
  if (signedIn.err) {
    log.info(`Signing into admin with ${username}:${secondaryPassword}`)
    signedIn = await tryCatch(apic.signIn, username, secondaryPassword)
    if (signedIn.err) log.throw('Sign in failed!')
    log.info(`Changing admin password: ${secondaryPassword} -> ${password}`)
    await apic.changePassword(secondaryPassword, password)
  }
  log.info('Creating mail server')
  const cms = await tryCatch(apic.createMailServer, mailServer)
  if (cms.err && alreadyAdded(cms.err)) {
    log.info('Pre-configured mail server is already added.')
  } else if (cms.err) log.showError(cms)
  log.info('Configuring mail server')
  await apic.configureMailServer(null, adminEmail)
  if (gatewayType === 'mixed' || gatewayType === 'v5') {
    log.info('Registering v5 gateway service')
    const v5rgs = await tryCatch(apic.registerGatewayService, 'v5')
    if (v5rgs.err && alreadyAdded(v5rgs.err)) {
      log.info('V5 gateway service is already registered.')
    } else if (v5rgs.err) log.showError(v5rgs)
  }
  if (gatewayType === 'mixed' || gatewayType === 'v6') {
    log.info('Registering v6 gateway service')
    const v6rgs = await tryCatch(apic.registerGatewayService, 'v6')
    if (v6rgs.err && alreadyAdded(v6rgs.err)) {
      log.info('V6 gateway service is already registered.')
    } else if (v6rgs.err) log.showError(v6rgs)
  }
  log.info('Registering analytics service')
  const ras = await tryCatch(apic.registerAnalyticsService)
  if (ras.err && alreadyAdded(ras.err)) {
    log.info('Analytics service is already registered.')
  } else if (ras.err) log.showError(ras)
  log.info('Associating analytics service')
  const aa7s = await tryCatch(apic.associateAnalytics)
  if (aa7s.err && alreadyAdded(aa7s.err)) {
    log.info('Analytics service is already associated.')
  } else if (aa7s.err) log.showError(aa7s)
  log.info('Registering portal service')
  const rps = await tryCatch(apic.registerPortalService)
  if (rps.err && alreadyAdded(rps.err)) {
    log.info('Portal service is already registered.')
  } else if (rps.err) log.showError(rps)
  await apic.signOut()

  options.set('strict', false)
}
