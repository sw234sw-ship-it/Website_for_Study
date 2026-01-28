import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

function getProjectId(): string {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.GCP_PROJECT) return process.env.GCP_PROJECT;
  if (process.env.FIREBASE_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_CONFIG);
      if (parsed.projectId) return parsed.projectId;
    } catch {
      // ignore
    }
  }
  throw new Error('Project ID not found for Secret Manager');
}

function normalizeSecretName(name: string): string {
  if (name.startsWith('projects/')) return name;
  const projectId = getProjectId();
  return `projects/${projectId}/secrets/${name}/versions/latest`;
}

export async function getSecretValue(name: string): Promise<string> {
  const secretName = normalizeSecretName(name);
  const [version] = await client.accessSecretVersion({ name: secretName });
  const data = version.payload?.data?.toString('utf-8') ?? '';
  if (!data) throw new Error(`Secret ${name} is empty`);
  return data;
}
