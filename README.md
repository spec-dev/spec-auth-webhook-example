# Spec Auth Webhook Example

Example Node.js server using the Spec auth webhook to manage users and DIDs.

## Setup

1) Clone this repo

```
$ git clone https://github.com/spec-dev/spec-auth-webhook-example && cd spec-auth-webhook-example
```

2) Install dependencies

```
$ npm install
```

3) Using your preferred method, ensure the following environment variables are set.

- `SPEC_API_KEY`: This is the API key used to authorize server-side requests from Spec. This is NOT your public anon key or your service-role key.

- `SPEC_JWT_SECRET`: The JWT secret for your spec project.

## Quickstart

Start the server:

```
$ npm start
```

## Overview

This is a super basic Node.js express server (`app.js`) that contains the following routes:

### Auth Webhook Route

This route handles a webhook sent from your Spec auth server during the sign-in verification process.

The webhook is immediately sent *after* signature verification has completed and the user's DID profile has been resolved, but *before* that request responds to the client. This webhook allows developers to use their own database for user management while still relying on Spec to manage the auth process. More specifically, it gives developers way to customize the user
object returned to the client in  following function call:

```javascript
const { user } = spec.auth.connect()
```

**Method**

`POST`

**Path**

Completely configurable (example uses `/spec/auth/success`), just make sure your Spec auth server has been configured
to your webhook url.

**Authentication**

In order to verify this request came from your Spec auth server, it should be authenticated using your `SPEC_API_KEY` environment variable. This key will be set in the `Spec-Api-Key` request header.

Luckily, as long as your `SPEC_API_KEY` environment variable is set, you can utilize the `authSpecWebhook` helper
function from the `@spec.dev/auth` library to authorize this request super easily:

```javascript
app.post('/spec/auth/success', async (req, res) => {
    if (!authSpecWebhook(req)) {
        res.statusCode = 401
        return res.json({ message: 'Invalid API key' })
    }
    ...
```

**Payload**

The payload for this request is always a JSON object with a `user` in it.

Example of payloads sent to this route:

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

b) User without a DID
```javascript
{
    "user": {
        "id": "0xba1D3fd5a923C6Bf543CB4Cd0712C096e39DaFA2",
        "did": null,
    }
}
```

**Response**

*Status*
Responding to this request with an error status code *will* cause the user's sign-in request to fail, so keep that in mind.

*Body*
The body of your response depends on what you wish to do with this hook:

1) Use-case #1: You do NOT want to overwrite the user object returned to the client.

    In this case, your response should simply be an empty JSON object `{}`.

2) Use-case #2: You DO want to overwrite the user object returned to the client.

    Your response should be a JSON object with a `user` property representing your own user data.

    **NOTE** If you choose to overwrite the user object, **make sure that either `user.id` or `user.address` is set to that user's address.

    Example response:
    ```javascript
    {
        "user": {
            "id": "0xba1D3fd5a923C6Bf543CB4Cd0712C096e39DaFA2",
            //...your own custom fields
        }
    }
    ```

## License

MIT