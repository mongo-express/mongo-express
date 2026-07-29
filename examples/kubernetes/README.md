# Kubernetes example

This example shows how to run mongo-express in a Kubernetes cluster.
The manifests in the example don't include MongoDB installation. The MongoDB service name used in [url-secret.yml](./url-secret.yml) must resolve from the mongo-express pod.

In [deployment.yml](./deployment.yml) the [official mongo-express Docker image](https://hub.docker.com/_/mongo-express) is used and preconfigured for basic authentication and admin access.

## ConfigMap

Environment variables are configured in [configmap.yml](./configmap.yml).

## Secrets

Additional environment variables are read from [Kubernetes secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
defined in [url-secret.yml](./url-secret.yml) and [basicauth-secret.yml](./basicauth-secret.yml). Even though taking credential values from a secret is
technically optional, it is often a recommended approach.

`url-secret.yml` contains the MongoDB connection string. If you use the root user created by the official MongoDB image, include `authSource=admin` in the connection string. `basicauth-secret.yml` contains only the mongo-express web login credentials.
