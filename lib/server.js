import http from 'http'
import url from 'url'
import fs from 'fs'
import path from 'path'
import { getJson } from './eleventy.js'
import { handleWebhook } from './webhook.js'
import { BASE_PATH, MIME_TYPES } from './config.js'

async function getProjectPathFromUrl(urlPath) {
  const [ , user, repo, ...path ] = urlPath.split('/')
  const hasTrailingSlash = urlPath.endsWith('/')
  // Remove trailing slash and double slashes
  const cleanPath =  `/${path.filter(Boolean).join('/')}`
  // Handle the case where cleanPath is / or /foo
  const finalPath = cleanPath + (!hasTrailingSlash || cleanPath.endsWith('/') ? '' : '/')
  console.log({user, repo, path, cleanPath, finalPath})

  return [`${BASE_PATH}/${user}/${repo}`, user, repo, finalPath]
}

function handleFileResponse(res, filePath, mimeType) {
  fs.readFile(filePath, (err, data) => {
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

function serve(port) {
  http.createServer(async (req, res) => {
    const { pathname, query } = url.parse(req.url, true)

    if (pathname.startsWith('/.pull')) {
      handleWebhook(req, res)
      return
    }

    const ext = pathname.endsWith('/') ? 'html' : path.extname(pathname).slice(1)
    const [projectPath, user, repo, permalink] = await getProjectPathFromUrl(pathname)
    console.log(`Serving ${pathname}.`, {query, ext})

    if (ext === 'html') {
      const result = await getJson({
        projectPath,
        templatePath: `${projectPath}${query.template}`,
        permalink,
        configPath: `${projectPath}/.eleventy.js`,
        baseUrl: `${user}/${repo}`,
      })

      if (result && result.content) {
        res.writeHead(200, { 'Content-Type': MIME_TYPES.html })
        res.end(result.content)
      } else {
        res.writeHead(404, { 'Content-Type': MIME_TYPES.html })
        res.end(`
          <h1>Page not found</h1>
          ${result ? result.error : 'Unknown error'}
        `)
      }
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

  console.log(`Server running at http://localhost:${port}/`)
}

export default serve
