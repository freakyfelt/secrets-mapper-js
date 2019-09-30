## What is this thing?

This package provides a structured, unified way to fetch secrets from various
sources and map them, allowing you to store references to secrets in your code
with the secrets being stored away in external services that provide auditing
and access controls.

## Getting Started

This getting started will assume a build-time script reading in a secrets.json
file stored in the package root (`$PKGROOT`).

```
# Sample $PKGROOT/secrets.json
{
  "production": {
    "DATABASE_USERNAME": "sm:aws:principal@MyApp/prod/db",
    "DATABASE_PASSWORD": "sm:aws:credential@MyApp/prod/db"
  }
}
```

## Migrating from secrets-manager.js

* All secrets must be prefixed with `sm:aws:` instead of `aws:` just to namespace ourselves

## Using the Command Line

The `secrets-mapper` command line script provides a quick way to map a JSON or
Dockerfile snippet that can then be merged with other files, such as a base
Dockerfile or an `env.json`

By default the output will be a non-pretty JSON string printed to STDOUT

```
$ secrets-mapper ./secrets.json
{"SECRET_1":"VALUE1","OTHER_SECRET":"VALUE2"}
```

If multiple files are passed the script will merge the top-level keys into a
single resulting JSON object, making directory globs a very effective way to
separate secrets into their use case.

### Handling multiple environments

If you want to store all of your secrets across all environments you can do so
in your JSON files and then specify which environment key you want using --env

```
$ secrets-mapper --env production secrets.json
```

### Dockerfile output

To generate a Dockerfile snippet that exports all of the environment variables
using secrets stored in `./secrets.json` to STDOUT:

```
$ secrets-mapper -f docker ./secrets.json
ENV SECRET_1=VALUE1
ENV OTHER_SECRET=VALUE2
...
```

The resulting value can then be `cat`ed with other files to generate a single
resulting Dockerfile.

## Programmatically

```
# Sample $PKGROOT/env.json.base
{
  "DATABASE_URL": "my-db.foobar.com",
  "DATABASE_PORT": 5432
}
```

```
const { mapSecrets } = require('@fatlama/secrets-mapper-js')
const fs = require('promise-fs')

async function buildEnvJson(environment) {
  const secrets = await fs.readFile('secrets.json')
    .then(content => JSON.parse(content))
    .then(content => mapSecrets(content[environment])
  const baseEnvJson = await fs.readFile('env.json.base')
    .then(content => JSON.parse(content))

  const result = {
    ...secrets,
    ...baseEnvJson
  }

  return fs.writeFile('env.json', JSON.stringify(result))
}
```

## Secrets Strategies

There are a few approaches to fetching your secrets: at build time and at run
time.

### Fetching At Build Time

Fetching your secrets at build time means you generate an `env.json` or a
`Dockerfile` as part of the build process, meaning your secrets are static for
each build.

**Advantages**

* not depending on the external service to be up at all times
* cost effective for AWS Secrets Manager (charged by API call)
* rollbacks will also roll back a secret

**Disadvantages**

* requires your secrets to be stable
* need to trigger a new build if you rotate a secret

### Fetching at start time

This means credentials are dynamically fetched container launch/restart time.

**Advantages**

* no build required to rotate a secret
* more stable than accessing the secret every time

**Disadvantages**

* risk that service can't restart if external service is down
* no ability to roll back secret changes

### Cache with expiry

This is the most unstable and most expensive approach and should be used
sparingly.

**NOTE**: This package does not currently support this mechanism

## What's a secret?

Secrets are usernames (principals), passwords (credentials), tokens, etc used
for accessing external services. As a best practice you should *never* store 
your secrets in a Git repo. If you do, you should immediately consider that
credential as compromised and have it rotated.

## What's a scheme?

Schemes provide a format for identifying where a secret is stored so that it can be fetched.

Currently the following schemes are supported:

### AWS Secrets Manager (`sm:aws:<key>@<secret-name>`)

AWS Secrets Manager stores multiple parts of a secret with an identifier
(secret name) that can then be later retrieved. Secrets can be stored as a
string or a binary blob.

*NOTE*: This package assumes the payload, regardless of string or binary blob,
is a valid, single-depth JSON payload.

For example, you might store your Twilio secrets at `MyApp/prod/twilio` with
the following data:

```
{
  principal: 'my-twilio-sid',
  credential: 'my-twilio-auth-token'
}
```

and in your mapping fetch the principal with this:

```
const secrets = async mapper.map({
  TWILIO_PRINCIPAL: 'sm:aws:principal@MyApp/prod/twilio'
})

expect(secrets.TWILIO_PRINCIPAL).to.equal('my-twilio-sid')
```
