const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { authSpecWebhook, getCurrentUserAddress } = require('@spec.dev/auth')

// Create express app.
const app = express()
app.use(cors())
app.use(bodyParser.json())

/**
* Webhook from Spec to handle newly signed in users.
*
* Responding to this request with a "user" in the response data will overwrite
* the "session.user" object handed back to the client when the auth flow completes.
*
* Payload: {
*     "user": {
*         "id": string (user address - e.g. '0x...')
*         "did": object | null (user DID)
*     }
* }
**/
app.post('/spec/auth/success', async (req, res) => {
    // Validate that Spec sent the request.
    if (!authSpecWebhook(req)) {
        res.statusCode = 401
        return res.json({ message: 'Invalid API key' })
    }

    // Validate the payload.
    const { user } = req.body || {}
    if (!user || !user.id) {
        res.statusCode = 400
        return res.json({ message: 'Invalid payload' })
    }

    // (1) Save the user and its DID to your database however you like.

    // (2) Format the "user" that you want returned to the client.
    // *NOTE* The user object you return NEEDS to either have "user.id" or "user.address" set as its address.
    user.foo = 'bar'

    const respData = {
        user
    }

    return res.json(respData)
})

/*
Example route showing how you can authorize your user requests with the
Spec auth header (JWT) once the user has signed-in with Spec.
*/
app.get('/my-route', async (req, res) => {
    // Get the address of the requesting user from the Spec auth header.
    // Will be null if the header doesn't exist or if the JWT is invalid or expired.
    const userAddress = getCurrentUserAddress(req)
    if (!userAddress) {
        res.statusCode = 401
        return res.json({ message: 'Unauthorized request' })
    }

    // Presumably query your DB to find the user by address.

    // Do whatever you want.

    res.statusCode = 200
    return res.json({ ok: true })
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Listening on ${port}...`))