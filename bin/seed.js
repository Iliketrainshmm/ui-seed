#!/usr/bin/env node

// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const { readdirSync } = require('fs')
const { resolve } = require('path')
const { scriptsDirectory, scriptFilePattern } = require('./configs')

const { log, error } = console
const scriptsDirectoryPath = resolve(__dirname, scriptsDirectory)
const [, , seedScript] = process.argv
const seedScripts = []

try {
  const filesInSeedScriptsDirectory = readdirSync(scriptsDirectoryPath)
  for (const file of filesInSeedScriptsDirectory) {
    if (file.match(scriptFilePattern)) seedScripts.push(file.replace('.js', ''))
  }
} catch (e) {
  return log(`failed to get available seed scripts.\n\n${e.stack}\n`)
}

if (!seedScript || !seedScripts.includes(seedScript)) {
  log('seed: run seed script')
  log('\nusage: npm run seed [seedScript] [cluster] [namespace] -- [options]')
  log('\n  seedScript must be one of:')
  log('   ', seedScripts.join('\n    '))
  log("\n  cluster: API host's cluster on GOA (i.e. groot-ui)")
  log("\n  namespace: API host's namespace on GOA (i.e. cd-staging)")
  log('\n  options: refer to seed/README.md for available options')
  return log('\nexample: npm run seed seedCustom -- --debug --verbose\n')
}

try {
  require(resolve(scriptsDirectoryPath, seedScript))()
} catch (e) {
  error(`Failed to execute seed script ${seedScript}.\n\n${e.stack}\n`)
}
