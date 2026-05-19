/**
 * Parses a GitLab Merge Request URL to extract the project identifier and the MR IID.
 * Matches pattern: gitlab.com/(.+?)/-/merge_requests/(\d+)
 * Returns { projectId: string (URL encoded with encodeURIComponent), mrIid: string }
 * Throws Error('Invalid GitLab MR URL') if pattern doesn't match.
 */
export function parseMRUrl(url: string): { projectId: string; mrIid: string } {
  const match = url.match(/gitlab\.com\/(.+?)\/-\/merge_requests\/(\d+)/);
  if (!match) {
    throw new Error('Invalid GitLab MR URL');
  }

  return {
    projectId: encodeURIComponent(match[1]),
    mrIid: match[2],
  };
}
