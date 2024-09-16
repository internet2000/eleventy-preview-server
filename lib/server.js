import http from 'http'
import url from 'url'
import path from 'path'
import { LOCAL_REPO_PATH, MIME_TYPES } from './config.js'
import { readFile } from 'fs'
import pull from './pull.js'
import run from './process.js'

async function getProjectPathFromUrl(urlPath) {
  const [ , user, repo, ...path ] = urlPath.split('/')
  const hasTrailingSlash = urlPath.endsWith('/')
  // Remove trailing slash and double slashes
  const cleanPath = `/${path
    .filter(Boolean)
    .map(p => decodeURIComponent(p))
    .join('/')}`
  // Handle the case where cleanPath is / or /foo
  const finalPath = cleanPath + (!hasTrailingSlash || cleanPath.endsWith('/') ? '' : '/')

  return [`${LOCAL_REPO_PATH}/${user}/${repo}`, user, repo, finalPath]
}

function handleFileResponse(res, filePath, mimeType) {
  readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error reading file ${filePath}`, err)
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('404 Not Found')
    } else {
      res.writeHead(200, { 'Content-Type': mimeType })
      res.end(data)
    }
  })
}

export default function serve(port) {
  http.createServer(async (req, res) => {
    const { pathname, query } = url.parse(req.url, true)

    if (pathname.startsWith('/.pull')) {
      const pathnameNoPrefix = pathname.replace('/.pull', '')
      const [projectPath, user, repo] = await getProjectPathFromUrl(pathnameNoPrefix)
      pull(req, res, { user, repo, projectPath, query })
    } else {
      const ext = pathname.endsWith('/') ? 'html' : path.extname(pathname).slice(1)
      const [projectPath, user, repo, permalink] = await getProjectPathFromUrl(pathname)

      if (ext === 'html') {
        run({ projectPath, permalink, query, user, repo })
        .then(({content}) => {
          res.writeHead(200, { 'Content-Type': MIME_TYPES.html })
          res.end(content)
        })
        .catch(error => {
          console.error(`Error processing ${user}/${repo} permalink ${permalink}`, error)
          res.writeHead(500, { 'Content-Type': 'text/html' })
          res.end('500 Internal Server Error')
        })
      } else if (MIME_TYPES[ext]) {
        const filePath = ext === 'js'
          ? `${projectPath}${permalink}`
          : ext === 'css'
            ? `${projectPath}/public${permalink}`
            : `${projectPath}${permalink}`
        handleFileResponse(res, filePath, MIME_TYPES[ext])
      } else {
        console.error(`Unknown extension ${ext}`)
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('404 Not Found')
      }
    }
  }).listen(port)

  console.info(`Server running at http://localhost:${port}/`)
}
