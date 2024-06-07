import http from 'http'
import url from 'url'
import fs from 'fs'
import path from 'path'
import { getJson } from './eleventy.js'

const PROJECT_PATH = process.env.PROJECT_PATH || '/home/lexoyo/_/i2k-meta/projects3/directus-starter'
const CSS_PATH = `${PROJECT_PATH}/public`
const ASSETS_PATH = `${PROJECT_PATH}`
const JS_PATH = `${PROJECT_PATH}`

const MIME_TYPES = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
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
    const ext = pathname.endsWith('/') ? 'html' : path.extname(pathname).slice(1)

    console.log(`Serving ${pathname} with extension ${ext}`, query)

    if (ext === 'html') {
      const result = await getJson({
        templatePath: query.template,
        permalink: pathname,
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
      const filePath = ext === 'js' ? `${JS_PATH}${pathname}` : ext === 'css' ? `${CSS_PATH}${pathname}` : `${ASSETS_PATH}${pathname}`
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
