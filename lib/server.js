import { fork } from 'child_process'
import http from 'http'
import url from 'url'
import path from 'path'
import { LOCAL_REPO_PATH, MIME_TYPES } from './config.js'
import { readFile } from 'fs'
import { handleWebhook } from './webhook.js'

const HTML_SERVER_SCRIPT = './lib/restart.js'

async function getProjectPathFromUrl(urlPath) {
  const [ , user, repo, ...path ] = urlPath.split('/')
  const hasTrailingSlash = urlPath.endsWith('/')
  // Remove trailing slash and double slashes
  const cleanPath = `/${path
    .filter(Boolean)
    .map(p => decodeURIComponent(p))
    .map(p => p.replace(/^\["(.*?)(?:",.*)?"\]$/, '$1')) // FIXME: Because of directus we need to ["folder_lang1", "folder_lang2"] => folder_lang1
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
      handleWebhook(req, res)
      return
    }

    const ext = pathname.endsWith('/') ? 'html' : path.extname(pathname).slice(1)
    const [projectPath, user, repo, permalink] = await getProjectPathFromUrl(pathname)

    if (ext === 'html') {
      // Fork a child process to handle the HTML request
      const child = fork(HTML_SERVER_SCRIPT, [], {
        env: process.env,
        stdio: 'inherit'
      })

      child.on('message', (message) => {
        if (message.type === 'response') {
          res.writeHead(message.statusCode, { 'Content-Type': MIME_TYPES.html })
          res.end(message.content)
        }
      })

      child.send({
        projectPath,
        query,
        permalink,
        user,
        repo
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
  }).listen(port)

  console.info(`Server running at http://localhost:${port}/`)
}
