# Kubernetes example

This example shows how to run mongo-express in a Kubernetes cluster.
The manifests in the example don't include the Mongodb installation.

In [deployment.yml](./deployment.yml) the mongo-express command is overwritten so the `--url` flag can be added.
But the application is started the same as normal using Tini and Yarn.

## Secrets

This example uses different environment variables read from a [Kubernetes secret](https://kubernetes.io/docs/concepts/configuration/secret/) 
defined in [secret.yml](./secret.yml) to create the connection URL. Even though taking these values from a secret is 
technically optional, it is often a requirement in realistic situations.

The values in the secret are base64 encoded as required by Kubernetes.

