import dotenv from 'dotenv'
dotenv.config()

export const PORT = process.env.PORT || 8080
export const LOCAL_REPO_PATH = process.env.LOCAL_REPO_PATH || '/tmp/previews'
export const GITLAB_URL = process.env.GITLAB_URL || 'gitlab.com'

export const MIME_TYPES = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
}
