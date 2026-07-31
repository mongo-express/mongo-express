# Docker Compose example

Runs MongoDB, mongo-express and nginx together, with nginx as the only published port.

```console
$ docker compose -f examples/docker-compose/compose.yaml up --build
```

Then open <http://localhost:8080> and log in with `admin` / `change-me-too`.

Run it from the repository root. The build context in [compose.yaml](./compose.yaml) is
relative to that file and points back at the repository, so the image is built from the
working tree rather than pulled — which is what makes this useful for trying out a change.

## What the pieces do

`mongo` starts with a root user and a named volume, so data survives `docker compose down`.
Its healthcheck gates startup: mongo-express waits for `service_healthy` rather than racing
the database.

`mongo-express` is built from this repository. It is reachable only from inside the compose
network — `expose` rather than `ports` — so nginx is the only way in.

`nginx` terminates the outside connection on port 8080 and proxies to mongo-express. Its
config is in [nginx/default.conf](./nginx/default.conf).

## Credentials

Two separate sets, which is easy to conflate:

- `ME_CONFIG_MONGODB_URL` carries the **MongoDB** credentials. It includes
  `authSource=admin`, which the root user created by the official MongoDB image requires.
- `ME_CONFIG_BASICAUTH_USERNAME` and `ME_CONFIG_BASICAUTH_PASSWORD` gate the **web
  interface** only. They are not used to authenticate against MongoDB.

The values in the file are placeholders. Replace them — including
`ME_CONFIG_SITE_SESSIONSECRET`, which signs the session cookie — before running this
anywhere that is not your laptop.

## Notes on the nginx config

`Host` and `X-Forwarded-Proto` are forwarded because mongo-express builds its own URLs from
the incoming request; without them, links come back pointing at the container.

`client_max_body_size` is raised to 64m. nginx defaults to 1m, which GridFS uploads hit
quickly.

`/status` is proxied separately with `access_log off`. The health check is served before
mongo-express's authentication, so probes reach it without credentials.
