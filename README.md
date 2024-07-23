# Setup

Run `npm install`

# Usage

`npm run seed [seedScript] [cluster] [namespace] -- [options]`

- If `seedScript` is not provided, help text will be shown
- If `cluster` or `namespace` is not provided, environment variable `API_HOST` will be used
  - Note: If `API_HOST` environment variable is not set explicitly, `seed/.env` file will be used

\
**seedScript (seed/scripts/seed\*.js)**

- seedCustom - example script to demo seeding with `apic` and `apim` modules provided by the ui-seed
  - apic.[method] - Methods for modifying admin component (i.e. creating provider org)
  - apim.[method]- Methods for modifying manager component (i.e. creating api)
- seedNightly - Initializes a new stack and adds some basic data to provider
  org `NightlyOrg`. Similar to data added by e2e tests.
- seedX - seed stack based on X file. Refer to sample X file `seed/scripts/assets/X.json`

**cluster:** API host's cluster on GOA (i.e. groot-ui, loki, etc.)

**namespace:** API host's namespace on GOA (i.e. master-staging, qa, etc.)

**options**

- `-b --baseHost`: provide the base host to have unspecified hosts auto computed
- `-c --config`: path to config file **(Required for `seedX`)**
- `-d --debug`: show debug output in console
- `-i --strict`: throw error instead of just logging error
- `-l --logToFile [logFile]`: write logs to a file (Default: `output/seed.log`)
- `-o --org <title>`: provide title for provider org (works for `seedNightly` and `seedX`)
- `-q --silentRetry`: Disable logging errors for each retry
- `-s --silent`: disable logging to console
- `-r --retries <retries>`: number of times to retry a request on server error (Default: 1)
- `-t --noTs`: disable timestamp prefix in console logging
- `-u --useAPIHost`: use `API_HOST` env variable even if cluster and namespace is provided
- `-v --verbose`: show verbose output in console
- `-x --http`: Use `http` instead of `https` for API host
- `--no-color`: disable colors in console logging
- `-h, --help`: display help for command

## Examples

- `npm run seed seedCustom -- -d -v`
- `npm run seed seedNightly loki qa -- --org SteveOrg`

Running on OVA (Update addresses for you stack)
```Bash
npm run seed seedX -- --useHostOptions \
--admin="https://apimdev1138.hursley.ibm.com" \
--manager="https://apimdev1138.hursley.ibm.com" \
--consumer="https://apimdev1138.hursley.ibm.com" \
--portalEndpoint="https://api.portal.apimdev0074.hursley.ibm.com" \
--portalEndpointBase="https://portal.apimdev0074.hursley.ibm.com" \
--analyticsEndpoint="https://a7s-in.apimdev0075.hursley.ibm.com" \
--v6GatewayEndpoint="https://apimdev0080.hursley.ibm.com:3000" \
--v6GatewayEndpointBase="https://apimdev0080.hursley.ibm.com:9443" \
--v5GatewayEndpoint="https://apimdev0079.hursley.ibm.com:3000" \
--v5GatewayEndpointBase="https://apimdev0079.hursley.ibm.com:9443" \
--config=scripts/assets/X.js
```

Running with a combined management endpoint on fyre
```Bash
export FYRE_HOST=fyre-ci-123456-master.fyre.ibm.com && npm run seed seedX -- --useHostOptions --baseHost "https://$FYRE_HOST" \
--admin="https://$FYRE_HOST" \
--manager="https://$FYRE_HOST" \
--consumer="https://$FYRE_HOST" \
--portalEndpoint="https://api.portal.$FYRE_HOST" \
--portalEndpointBase="https://portal.$FYRE_HOST" \
--v5GatewayEndpoint="https://gwd.$FYRE_HOST" \
--v5GatewayEndpointBase="https://gw.$FYRE_HOST" \
--v6GatewayEndpoint="https://rgwd.$FYRE_HOST" \
--v6GatewayEndpointBase="https://rgw.$FYRE_HOST" \
--analyticsEndpoint="https://ai.$FYRE_HOST"
--config=scripts/assets/X.js
```

> `--` is needed to prevent options from being teated as options for `npm` command.

# Usage within Slack

Refer to [seedBot](https://github.ibm.com/Ibrahim-Manjra/seedBot) project

# Usage in E2E tests

Refer to `seedData` function in any one of e2e tests below to see an example:

```
- src/cat/pages/ConsumerOrgsList/__tests__/consumer-org-list.e2e.js
- src/cat/pages/ConsumerOrgsPendingInvitationsList/__tests__/consumer-org-invitation.e2e.js
- src/cat/pages/Manage/ManageApplications/__tests__/apps-list.e2e.js
- src/dev/pages/apis-and-products/list/__tests__/apis-and-product-list.e2e.js
```
