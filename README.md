# Spec Auth Webhook Example

This is an example Node.js server (express app) demonstrating how to use the Spec auth webhook to customize the Spec user sign-in flow.

## Setup

1) Clone this repository

    ```
    $ git clone https://github.com/spec-dev/spec-auth-webhook-example && cd spec-auth-webhook-example
    ```

2) Install dependencies

    ```
    $ npm install
    ```

3) Using your preferred method, ensure the following environment variables are set.

- `SPEC_API_KEY`: This is the API key used to authorize server-side requests from Spec. This is NOT your public anon key *or* your service-role key.

- `SPEC_JWT_SECRET`: The JWT secret for your spec project.

## Quickstart

Start the server:

```
$ npm start
```

## Overview

This is a basic Node.js express server ([`app.js`](app.js)) that contains the following routes:

### Route 1 - Auth Webhook

This route handles a webhook sent from your Spec auth server during the sign-in verification process.

The webhook is sent *after* signature verification has completed (and the user's DID profile has been resolved) but *before* responding to the client. This webhook allows developers to use their own database for user management while still relying on Spec to handle the auth process. More specifically, it gives developers way to customize the user
object returned to the client in  following function call:

```javascript
const { user } = spec.auth.connect()
```

#### Request Method

`POST`

#### Request Path

This is completely configurable (this example uses `/spec/auth/success`), just make sure your Spec auth server has been configured to use your webhook url.

#### Authentication

In order to verify the request was sent from your Spec auth server, it should be authenticated using your `SPEC_API_KEY` environment variable. This value should match the `Spec-Api-Key` header value on any incoming requests.

Luckily, as long as your `SPEC_API_KEY` environment variable is set, you can utilize the `authSpecWebhook` helper
function from the `@spec.dev/auth` library to easily authorize this request.

```javascript
const { authSpecWebhook } = require('@spec.dev/auth')

app.post('/spec/auth/success', async (req, res) => {
    if (!authSpecWebhook(req)) {
        res.statusCode = 401
        return res.json({ message: 'Invalid API key' })
    }
    ...
```

#### Payload

The incoming request payload is a JSON object with a `user` in it.

Example payloads:

a) User with an ENS DID:
```javascript
{
    "user": {
        "id": "0xba1D3fd5a923C6Bf543CB4Cd0712C096e39DaFA2",
        "did": {
            "domain": "vitalik.eth",
            "textRecords": {
                "email": null,
                "url": "https://vitalik.ca",
                "avatar": "https://ipfs.io/ipfs/QmSP4nq9fnN9dAiCj42ug9Wa79rqmQerZXZch82VqpiH7U/image.gif",
                "name": null,
                "description": null
            }
        }
    }
}
```

b) User without a DID:
```javascript
{
    "user": {
        "id": "0xba1D3fd5a923C6Bf543CB4Cd0712C096e39DaFA2",
        "did": null,
    }
}
```

#### Reponse Status

Responding to this request with an error status code will cause the user's sign-in request to fail, so keep that in mind.

#### Reponse Body

The body of your response should always be a JSON object, but that object's contents depends on what you wish to do with the hook:

1) **First Option** -- You do *NOT* want to overwrite the user object returned to the client.

    In this case, your response body should simply be an empty JSON object `{}`.

2) **Second Option** -- You *DO* want to overwrite the user object returned to the client.

    In this case, your response body should be a JSON object with a `user` property representing your own user data.

    **NOTE:** If you choose to overwrite the user object, **make sure that either** `user.id` **or** `user.address` **is set to that user's address.** This is required.

    Example response:
    ```javascript
    {
        "user": {
            "id": "0xba1D3fd5a923C6Bf543CB4Cd0712C096e39DaFA2",
            //...your own custom fields
        }
    }
    ```

### Route 2 - Route Requiring User Auth

`GET /my-route` within `app.js`

This route demonstrates how you can authorize a user's request using their Spec auth header (JWT).

After the user has signed-in with Spec, their active session is stored in `localStorage`. That session's `access_token` is a JWT that is sent along with all requests to Spec in the `Authorization` request header. This JWT
can be used in the same manner when making calls to your own API.

Client side, you can use the following function to access this JWT as a formatted request header:
```javascript
const authHeaders = spec.auth.sessionHeaders()
// => { "Authorization": "Bearer <access-token>" }
```

#### Authorizing User Requests

To authorize requests with a user's Spec JWT, you can utilize the `getCurrentUserAddress` helper function from
the `@spec.dev/auth` library:
```javascript
const { getCurrentUserAddress } = require('@spec.dev/auth')

app.get('/my-route', async (req, res) => {
    const userAddress = getCurrentUserAddress(req)
    if (!userAddress) {
        res.statusCode = 401
        return res.json({ message: 'Unauthorized request' })
    }

    // Presumably find your user record with this address...
```

If the JWT isn't provided, is invalid, is expired, or the user's address simply doesn't exist in the JWT claims, then
the `userAddress` value above will be `null`.

## Local Development

Spec auth is great, but how does the webhook work when building and testing your app locally? Great question.

To integrate the Spec auth webhook with local development, perform the following 2 steps:

1) Make sure your app is pointed to your Spec project dedicated for local development (this Spec project shouldn't have an auth webhook url configured).

2) Add the following configuration options when initializing your Spec client:
    ```javascript
    import { createClient } from '@spec.dev/client'

    const specUrl = process.env.REACT_APP_SPEC_URL
    const specKey = process.env.REACT_APP_SPEC_KEY

    // Create Spec Client.
    export const spec = createClient(specUrl, specKey, {
        localDev: true,
        localApiKey: 'your-spec-api-key', // The `SPEC_API_KEY` env var you configured earlier
        localAuthHook: 'your-local-auth-webhook-url', // Ex: http://localhost:3000/spec/auth/success
    })
    ```

    **NOTE:** The `localApiKey` above should *NEVER* be published or used on the client outside of local development. This key is meant to be kept secret and technically only used server-side.

    A better way of configuring the above would be to use environment variables. This way, you can ensure your `localApiKey` is only ever set during local development.

    ```javascript
    // ...

    // Create Spec Client.
    export const spec = createClient(specUrl, specKey, {
        localDev: process.env.REACT_APP_IS_LOCAL_DEV,
        localApiKey: process.env.REACT_APP_LOCAL_API_KEY, // Don't set this outside of your local dev environment
        localAuthHook: process.env.REACT_APP_LOCAL_AUTH_HOOK,
    })
    ```

Once your Spec client is configured for local development (per above), the auth webhook will be run client side before the auth flow completes.

## License

MIT