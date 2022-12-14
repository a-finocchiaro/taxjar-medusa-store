# Taxjar with Medusa

This is a basic Medusa store complete with a taxjar implementation. 

## Prerequisites

- Must have an active Taxjar account with the __professional__ tier.
- Have Postgres running locally and create a database named "medusa-dev-store"
- Have Redis running locally

## Setup

1) Clone the project

```
git clone git@github.com:a-finocchiaro/taxjar-medusa-store.git
```

2) Install dependancies

```
npm install
```

3) Add necessary environment variables

```sh
TAXJAR_API_KEY=1234  # To test, use the sandbox key
TAXJAR_URL="https://api.sandbox.taxjar.com"  # remove sandbox in production
```

3) Start the server

```
medusa develop
```
