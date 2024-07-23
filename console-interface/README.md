# Seed CLI

DevTools interface for seed script

## Demo

[Video on Box](https://ibm.box.com/s/d2sgyyvbteb29ykl563znxuhc56r6i2a)

## Setup

1. Install [User JavaScript and CSS](https://ibm.biz/BdqZv5) chrome extension
2. Go to extension's setting page
3. Click `Libraries` and add:
   - **lodash.js**
     - Name: lodash
     - URL: https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.15/lodash.min.js
   - **Faker.js**
     - Name: Faker
     - URL: https://cdnjs.cloudflare.com/ajax/libs/Faker/3.1.0/locales/en_CA/faker.en_CA.min.js
4. Click `Sites` tab then `Add new site` button
5. In domain input field, enter `*.ciondemand.com,localhost`
6. Copy everything in `index.js` file and paste in `JS` textarea (on the left)
7. Click `Options` button beside domain field, and enable `lodash` and `Faker`
   then click `Save` (top-right)
8. Go to any stack or localhost site and launch DevTools
9. In DevTools, start by first signing in by calling `apic.signIn(...)` [admin]
   or `apim.signIn(...)` [manager] method.
10. Explore available methods by typing `apim.` getting auto-completion

## Notes

- CLI mode does minimal error checking, follow method's signature for guidance
- Not every apim and apic methods in seed library are available in CLI mode
- You may use method `apim/apic.setAuthToken(token)` to manually set auth
  token for OIDC user. You can find this token in `Authorization` header of
  any API request (i.e `Bearer ...`) after signing in with OIDC account.

## Example

```js
// Admin
apic.signIn('admin', '8iron-hide');
apic.createProviderOrg('SteveOrg', 'steve'); // steve will be added if not found

// Manager
apim.signIn('steve', '7iron-hide');
apim.createAPIs('steveorg', 5); // logs array of added apis once completed
/**
 * You may store output from method above to temp variable `{temp#}` by right
 *  clicking output and clicking `Store as global variable` and use it later
 */
apim.createProducts('steveorg', 5, temp1);
```
