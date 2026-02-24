# Kubernetes example

This example shows how to run mongo-express in a Kubernetes cluster.
The manifests in the example don't include MongoDB installation.

In [deployment.yml](./deployment.yml) the [official mongo-express Docker image](https://hub.docker.com/_/mongo-express) is used and preconfigured for basic authentication and admin access.

## ConfigMap

Environment variables are configured in [configmap.yml](./configmap.yml).

## Secrets

Additional environment variables are read from [Kubernetes secrets](https://kubernetes.io/docs/concepts/configuration/secret/) 
defined in [url-secret.yml](./url-secret.yml) and [basicauth-secret.yml](./basicauth.yml). Even though taking credential values from a secret is 
technically optional, it is often a recommended approach.

