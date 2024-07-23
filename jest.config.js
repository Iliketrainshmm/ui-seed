// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2022, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const jestConfig = {
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.(unit|test).[jt]s'],
  moduleNameMapper: {},
  testEnvironment: 'node',
}

module.exports = jestConfig
