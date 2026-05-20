export function parseMRUrl(url: string): { projectPath: string; mrIid: string } {
  const match = url.match(/gitlab\.com\/(.+?)\/-\/merge_requests\/(\d+)/);
  if (!match) {
    throw new Error('Invalid GitLab MR URL. Expected: https://gitlab.com/username/repo/-/merge_requests/123');
  }
  
  return {
    projectPath: match[1],
    mrIid: match[2],
  };
}
