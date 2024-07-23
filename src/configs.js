// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

require('dotenv').config() // import environment variables from .env file

module.exports = {
  client_id: 'caa87d9a-8cd7-4686-8b6e-ee2cdc5ee267', // for authentication
  client_secret: '3ecff363-7eb3-44be-9e07-6d4386c48b0b', // for authentication
  consumer_client_id: '819a8de7-7204-4adb-918f-391ba39d29d0', // for authentication
  consumer_client_secret: '8dad5699-acbf-40ab-85c1-48361981bc75', // for authentication
  defaultLimit: 25, // maximum number of requests to send in parallel by default
  defaultMethod: 'GET', // default http method to use by default
  defaultTimeout: 3 * 60 * 1000, // default timeout for requests in ms (3 mins)
}
