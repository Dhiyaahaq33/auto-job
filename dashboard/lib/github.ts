const API = "https://api.github.com";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is not set`);
  return v;
}

function repoInfo() {
  return { owner: env("GITHUB_OWNER"), repo: env("GITHUB_REPO") };
}

async function gh(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env("GITHUB_TOKEN")}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${path} failed: ${res.status} ${body}`);
  }
  return res;
}

const WORKFLOW_FILE = process.env.WORKFLOW_FILE || "job-bot-daily.yml";

export async function listWorkflowRuns(perPage = 10) {
  const { owner, repo } = repoInfo();
  const res = await gh(
    `/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=${perPage}`
  );
  const data = await res.json();
  return data.workflow_runs as Array<{
    id: number;
    status: string;
    conclusion: string | null;
    created_at: string;
    updated_at: string;
    html_url: string;
    event: string;
    run_started_at: string;
  }>;
}

export async function getRunJobs(runId: number) {
  const { owner, repo } = repoInfo();
  const res = await gh(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
  return res.json();
}

export async function triggerWorkflow() {
  const { owner, repo } = repoInfo();
  await gh(`/repos/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref: "main" }),
  });
}

export async function getFileContent(path: string) {
  const { owner, repo } = repoInfo();
  const res = await gh(`/repos/${owner}/${repo}/contents/${path}?ref=main`);
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha as string };
}

export async function updateFileContent(path: string, newContent: string, message: string, sha: string) {
  const { owner, repo } = repoInfo();
  await gh(`/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(newContent, "utf-8").toString("base64"),
      sha,
      branch: "main",
    }),
  });
}

export async function getRepoPublicKey() {
  const { owner, repo } = repoInfo();
  const res = await gh(`/repos/${owner}/${repo}/actions/secrets/public-key`);
  return res.json() as Promise<{ key_id: string; key: string }>;
}

export async function putSecret(secretName: string, encryptedValueB64: string, keyId: string) {
  const { owner, repo } = repoInfo();
  await gh(`/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
    method: "PUT",
    body: JSON.stringify({ encrypted_value: encryptedValueB64, key_id: keyId }),
  });
}
