module.exports = {
  providerOrg: 'ibm', // see point 1 below
  prefix: 'API Connect', // # i.e [API Connect] [Generated Name] API (Optional)
  fastMode: true, // see point 2 below (Optional) [default: true]
  skipAdmin: false, // see point 4 below (Optional) [default: false]
  cleanOrg: false, // deletes the provider org before seeding (Optional) [default: false]
  gatewayType: 'mixed', // gateway type ['v5', 'v6', or 'mixed'] for APIs and products (optional) [default: 'mixed']
  excludeSandbox: true, // If true, sandbox catalog will not be seeded [default: false]
  numberOfDraftAPIs: 5,
  numberOfDraftProducts: 5,
  numberOfCatalogs: 2,
  numberOfSpaces: 0, // see point 5 below  (Optional) [default: 0 <=> disabled]
  numberOfPublishedProducts: 5, // see point 6 below
  numberOfConsumerOrgs: 5, // see point 6 below
  numberOfApps: 5, // see point 6 below
  numberOfSubscriptions: 5, // see point 6 below
  numberOfOAuthProviders: 0,
  adminEmail: 'admin-example@ibm.com', // Cloud Admin Email to set for email notifications
  populationType: 'complex', // Population type ['simple', 'complex']
  credentials: {
    defaultAdminPassword: '7iron-hide',
    admin: {
      numberOfAdmins: 2,
      username: 'admin',
      password: '8iron-hide',
    },
    manager: {
      numberOfProviders: 2,
      username: 'steve', // User with the username provided will be created if not found
      password: '7iron-hide',
      email: 'example@ibm.com',
    },
    consumer: {
      numberofConsumers: 2, // Creates consumer org members based off the below details
      consumerRoles: ['developer', 'administrator'], // Any of ['viewer', 'developer', 'administrator']
      username: 'portal', // User with the username provided will be created if not found
      password: '7iron-hide',
      email: 'corg-email@ibm.com',
    },
  },
  // Must have a custom portal endpoint deployed in format of custom-portal.<stack-host>
  customEndpointPortal: false,
  // Default to emea relay if not set
  mailServer: {
    title: 'EMEA relay',
    name: 'emea-relay',
    host: 'emea.relay.ibm.com',
    port: 25,
  },
  addEventsIterations: 10, // Initial number of times per day per API per catalog
  daysToGenerateEvents: 30, // How many days back should events be generated.
  proportionOfAICalls: 0.5, // How many of the mock API calls are AI. Values 0 to 1.
  seedPattern: [
        'weekends', // Weekends will have less events (work in progress)
        'up', // Up trend
        // 'DDOS', // DDos attack (work in progress)
        // "APILaunch", // APIs replacing each other (work in progress)
      ],
  // OIDC config.type possible values : google | github | facebook | linkedin | slack | twitter | windows_live | standard
  userRegistry: {
    type: '', // Possible values : oidc
    config: {
      type: 'google',
      title: 'Google OIDC',
      clientId: '-',
      clientSecret: '-',
    },
  },
}

/** ---------------------------------- Notes: ----------------------------------

1. When seeding an existing provider org, make use of unique prefix to avoid
   collision existing artifacts in provider org.

2. In fast mode, draft APIs will not be shared amongst draft products to allow
   publishing products concurrently. As a result, `numberOfDraftAPIs` must
   be >= `numberOfDraftProducts`.

3. Login attempt will first be made with `admin.password`. If login fails,
   second attempt will be made with `admin.secondaryPassword`. If login succeeds
   on second attempt, password will be changed from `admin.secondaryPassword` to
   `admin.password`

4. When `skipAdmin` is true, admin side will not be configured (i.e. registering
   gateway service, portal, mail-server, etc.).

5. If `numberOfSpaces` is set to 0, spaces will not be enabled in catalog.

6. `numberOfPublishedProducts`,`numberOfApps`, `numberOfConsumerOrgs`,
   `numberOfSubscriptions`, and `numberOfOAuthProviders` will be per catalog. If
   `numberOfSpaces` is > 0, `numberOfPublishedProducts` and `numberOfSubscriptions`
   will be randomly distributed across spaces of the catalog.

*/