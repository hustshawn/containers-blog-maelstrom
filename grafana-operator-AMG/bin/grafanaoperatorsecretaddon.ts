import 'source-map-support/register';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as eks from "aws-cdk-lib/aws-eks";
import { Construct } from 'constructs';
import { GrafanaOperatorHelmAddon } from './grafanaoperatoryhelmaddon';
import { dependable } from '@aws-quickstart/eks-blueprints/dist/utils';

export class GrafanaOperatorSecretAddon implements blueprints.ClusterAddOn {
    id?: string | undefined;
    @dependable(blueprints.addons.ExternalsSecretsAddOn.name, GrafanaOperatorHelmAddon.name)
    deploy(clusterInfo: blueprints.ClusterInfo): void | Promise<Construct> {
        const cluster = clusterInfo.cluster;
        new eks.KubernetesManifest(clusterInfo.cluster.stack, "ClusterSecretStore", {
            cluster: cluster,
            manifest: [
                {
                    apiVersion: "external-secrets.io/v1beta1",
                    kind: "ClusterSecretStore",
                    metadata: {name: "default"},
                    spec: {
                        provider: {
                            aws: {
                                service: "SecretsManager",
                                region: clusterInfo.cluster.stack.region,
                                auth: {
                                    jwt: {
                                        serviceAccountRef: {
                                            name: "external-secrets-sa",
                                            namespace: "external-secrets",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            ],
        });
        
        new eks.KubernetesManifest(clusterInfo.cluster.stack, "ExternalSecret", {
            cluster: cluster,
            manifest: [
                {
                    apiVersion: "external-secrets.io/v1beta1",
                    kind: "ExternalSecret",
                    metadata: {
                        name: "external-grafana-admin-credentials",
                        namespace: "grafana-operator"
                        },
                    spec: {
                        secretStoreRef: {
                            name: "default",
                            kind: "ClusterSecretStore",
                        },
                        target: {
                            name: "grafana-admin-credentials",
                            creationPolicy: "Merge",
                        },
                        data: [
                            {
                                secretKey: "GF_SECURITY_ADMIN_APIKEY",
                                remoteRef: {
                                    key: "grafana-api-key"
                                },
                            },
                        ],
                    },
                },
            ],
        });
    }
}