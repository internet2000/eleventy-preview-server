import http from 'http'
import url from 'url'
import path from 'path'
import { LOCAL_REPO_PATH, MIME_TYPES } from './config.js'
import { readFile } from 'fs'
import pull from './pull.js'
import run from './build-page.js'
import discover from './discover.js'
import response from './response.js'

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
      res.writeHead(404, { 'Content-Type': 'text/html' })
      res.end(response({
        title: '404 Not Found',
        text: 'The file you are looking for does not exist.',
        error: err
      }))
    } else {
      res.writeHead(200, { 'Content-Type': mimeType })
      res.end(data)
    }
  })
}

export default function serve(port) {
  http.createServer(async (req, res) => {
    req.setTimeout(60000, () => {
      console.error(`Request timed out: ${req.url}`)
      res.writeHead(504, { 'Content-Type': 'text/html' })
      res.end(`
        <html>
          <head><title>Request Timeout</title></head>
          <body>
            <h1>504 Gateway Timeout</h1>
            <p>Your request took too long to process.</p>
          </body>
        </html>
      `)
    })

    try {
      const { pathname, query } = url.parse(req.url, true)

      if (pathname.startsWith('/.pull')) {
        const pathnameNoPrefix = pathname.replace(/^\/\.pull/, '')
        const [projectPath, user, repo] = await getProjectPathFromUrl(pathnameNoPrefix)
        pull(req, res, { user, repo, projectPath, query })
      } else {
        const ext = pathname.endsWith('/') ? 'html' : path.extname(pathname).slice(1)
        const pathnameNoPrefix = pathname.replace(/^\/\.auto/, '')
        const [projectPath, user, repo, permalink] = await getProjectPathFromUrl(pathnameNoPrefix)

        if (ext === 'html') {
          const rnd = Math.floor(Math.random() * 1000)
          console.time(`⏱ ${rnd} Processed ${user}/${repo} permalink ${permalink}`)
          let template = query?.template

          if (!template && pathname.startsWith('/.auto')) {
            try {
              console.log(`\u001b[32mDiscovering pages for ${user}/${repo}\u001b[0m`)
              console.time(`⏱ ${rnd} Discovered ${user}/${repo}`)
              template = await discover({ projectPath, user, repo, permalink })
              console.timeEnd(`⏱ ${rnd} Discovered ${user}/${repo}`)
            } catch (error) {
              console.error(`Error discovering pages for ${user}/${repo}`, error)
              res.writeHead(500, { 'Content-Type': 'text/html' })
              res.end(response({
                title: 'Build Error',
                text: 'There was an error building this page',
                error: error
              }))
              console.timeEnd(`⏱ ${rnd} Discovered ${user}/${repo}`)
              console.timeEnd(`⏱ ${rnd} Processed ${user}/${repo} permalink ${permalink}`)
              return
            }
            if (template) {
              console.log(`\u001b[32mFound template ${template} for ${permalink}\u001b[0m`)
            } else {
              console.error(`\u001b[31mCould not find template for ${user}/${repo} permalink: ${permalink}\u001b[0m`)
              res.writeHead(500, { 'Content-Type': 'text/html' })
              res.end(response({
                title: 'Build Error',
                text: 'There was an error building this page: template not found. This page may not exist, or maybe this website does not exist.',
                error: `Could not find template for ${user}/${repo} permalink: ${permalink}.`
              }))
              console.timeEnd(`⏱ ${rnd} Processed ${user}/${repo} permalink ${permalink}`)
              return
            }
          }
          console.time(`⏱ ${rnd} Build ${user}/${repo} permalink ${permalink}`)
          run({ projectPath, permalink, template, user, repo })
          .then(({ content }) => {
            res.writeHead(200, { 'Content-Type': MIME_TYPES.html })
            res.end(content)
            console.timeEnd(`⏱ ${rnd} Build ${user}/${repo} permalink ${permalink}`)
            console.timeEnd(`⏱ ${rnd} Processed ${user}/${repo} permalink ${permalink}`)
          })
          .catch(error => {
            console.error(`Error processing ${user}/${repo} permalink ${permalink}`, error)
            res.writeHead(500, { 'Content-Type': 'text/html' })
            res.end(response({
              title: 'Build Error',
              error: error,
              text: 'There was an error building this page'
            }))
            console.timeEnd(`⏱ ${rnd} Build ${user}/${repo} permalink ${permalink}`)
            console.timeEnd(`⏱ ${rnd} Processed ${user}/${repo} permalink ${permalink}`)
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
          res.writeHead(500, { 'Content-Type': 'text/html' })
          res.end(response({
            title: '404 Not Found',
            text: 'The file you are looking for does not exist.',
            error: `Unknown extension ${ext}`
          }))
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      res.writeHead(500, { 'Content-Type': 'text/html' })
      res.end(`
        <html>
          <head><title>Internal Server Error</title></head>
          <body>
            <h1>500 Internal Server Error</h1>
            <p>An unexpected error occurred. Please try again later.</p>
          </body>
        </html>
      `)
    }
  }).listen(port)

  console.info(`Server running at http://localhost:${port}/`)
}
