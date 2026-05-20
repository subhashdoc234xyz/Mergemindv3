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

async function fetchGitLab(path: string, options: RequestInit = {}) {
  const apiUrl = process.env.GITLAB_API_URL || "https://gitlab.com";
  const token = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Missing GITLAB_PERSONAL_ACCESS_TOKEN");
  }

  const res = await fetch(`${apiUrl}/api/v4${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`GitLab API HTTP error ${res.status}: ${await res.text()}`);
  }

  // Handle empty responses (like 204 No Content or empty strings)
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getMRChanges(projectPath: string, mrIid: string): Promise<MRData> {
  const encodedPath = encodeURIComponent(projectPath);
  
  // Fetch MR details
  const mrDetails = await fetchGitLab(`/projects/${encodedPath}/merge_requests/${mrIid}`);
  
  // Fetch MR changes
  const mrChanges = await fetchGitLab(`/projects/${encodedPath}/merge_requests/${mrIid}/changes`);

  return {
    title: mrDetails.title,
    description: mrDetails.description,
    author: { name: mrDetails.author?.name || 'Unknown' },
    changes: mrChanges.changes?.map((c: any) => ({
      new_path: c.new_path,
      diff: c.diff
    })) || []
  };
}

export async function getRecentMRs(projectPath: string): Promise<MRSummary[]> {
  const encodedPath = encodeURIComponent(projectPath);
  const mrs = await fetchGitLab(`/projects/${encodedPath}/merge_requests?state=merged&per_page=5`);
  return mrs.map((mr: any) => ({ title: mr.title }));
}

export async function getMRNotes(projectPath: string, mrIid: string): Promise<MRNote[]> {
  const encodedPath = encodeURIComponent(projectPath);
  const notes = await fetchGitLab(`/projects/${encodedPath}/merge_requests/${mrIid}/notes`);
  return notes.map((note: any) => ({
    body: note.body,
    system: note.system
  }));
}

export async function postMRComment(projectPath: string, mrIid: string, body: string): Promise<void> {
  const encodedPath = encodeURIComponent(projectPath);
  await fetchGitLab(`/projects/${encodedPath}/merge_requests/${mrIid}/notes`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}
