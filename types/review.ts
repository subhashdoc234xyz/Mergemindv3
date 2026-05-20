export interface ReviewIssue {
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION'
  title: string
  file: string
  explanation: string
  fix: string
  comment: string
}

export interface ReviewResponse {
  summary: string
  healthScore: number
  issues: ReviewIssue[]
  commentsPosted: number
  error?: string
}
