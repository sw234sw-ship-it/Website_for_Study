"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecretValue = getSecretValue;
const secret_manager_1 = require("@google-cloud/secret-manager");
const client = new secret_manager_1.SecretManagerServiceClient();
function getProjectId() {
    if (process.env.GCLOUD_PROJECT)
        return process.env.GCLOUD_PROJECT;
    if (process.env.GCP_PROJECT)
        return process.env.GCP_PROJECT;
    if (process.env.FIREBASE_CONFIG) {
        try {
            const parsed = JSON.parse(process.env.FIREBASE_CONFIG);
            if (parsed.projectId)
                return parsed.projectId;
        }
        catch {
            // ignore
        }
    }
    throw new Error('Project ID not found for Secret Manager');
}
function normalizeSecretName(name) {
    if (name.startsWith('projects/'))
        return name;
    const projectId = getProjectId();
    return `projects/${projectId}/secrets/${name}/versions/latest`;
}
async function getSecretValue(name) {
    const secretName = normalizeSecretName(name);
    const [version] = await client.accessSecretVersion({ name: secretName });
    const data = version.payload?.data?.toString('utf-8') ?? '';
    if (!data)
        throw new Error(`Secret ${name} is empty`);
    return data;
}
//# sourceMappingURL=secrets.js.map