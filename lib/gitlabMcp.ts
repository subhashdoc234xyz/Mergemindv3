export interface MRChange {
  new_path: string
  diff: string
}

export interface MRData {
  title: string
  description: string | null
  author: { name: string }
  changes: MRChange[]
}

export interface MRSummary {
  title: string
}

export interface MRNote {
  body: string
  system: boolean
}

async function callMCP(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const mcpUrl = process.env.GITLAB_MCP_URL;
  const token = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;

  if (!mcpUrl || !token) {
    throw new Error("Missing GITLAB_MCP_URL or GITLAB_PERSONAL_ACCESS_TOKEN");
  }

  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
  };

  const res = await fetch(mcpUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`GitLab MCP HTTP error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`GitLab MCP tool error: ${JSON.stringify(json.error)}`);
  }

  return json.result;
}

export async function getMRChanges(projectPath: string, mrIid: string): Promise<MRData> {
  return callMCP("get_merge_request", { project_path: projectPath, iid: parseInt(mrIid, 10) }) as Promise<MRData>;
}

export async function getRecentMRs(projectPath: string): Promise<MRSummary[]> {
  return callMCP("list_merge_requests", { project_path: projectPath, state: "merged", per_page: 5 }) as Promise<MRSummary[]>;
}

export async function getMRNotes(projectPath: string, mrIid: string): Promise<MRNote[]> {
  return callMCP("list_merge_request_notes", { project_path: projectPath, iid: parseInt(mrIid, 10) }) as Promise<MRNote[]>;
}

export async function postMRComment(projectPath: string, mrIid: string, body: string): Promise<void> {
  await callMCP("create_merge_request_note", { project_path: projectPath, iid: parseInt(mrIid, 10), body });
}
