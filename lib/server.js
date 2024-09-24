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
        let template = query?.template
        if(!template && pathname.startsWith('/.auto')) {
          try {
            console.log(`\u001b[32mDiscovering pages for ${user}/${repo}\u001b[0m`)
            const pages = await discover({ projectPath, user, repo, query })
            console.log(`\u001b[32mDiscovered ${pages.length} pages for ${user}/${repo}\u001b[0m`)
            pages.forEach(page => console.log(`\u001b[37m${page.url}\u001b[0m`))
            const permalinkNoTrailingSlash = permalink.replace(/\/$/, '')
            const pagesNoTrailingSlash = pages.map(page => ({ ...page, url: page.url.replace(/\/$/, '') }))
            console.log(`\u001b[32mLooking for template for ${permalinkNoTrailingSlash} in ${pages.map(page => page.url)}\u001b[0m`)
            template = pagesNoTrailingSlash.find(page => page.url === permalinkNoTrailingSlash)?.inputPath.replace(/^\./, '') // remove training dot that eleventy adds
          } catch (error) {
            console.error(`Error discovering pages for ${user}/${repo}`, error)
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
            return
          }
        }
        run({ projectPath, permalink, template, user, repo })
        .then(({content}) => {
          res.writeHead(200, { 'Content-Type': MIME_TYPES.html })
          res.end(content)
        })
        .catch(error => {
          console.error(`Error processing ${user}/${repo} permalink ${permalink}`, error)
          res.writeHead(500, { 'Content-Type': 'text/html' })
          res.end(response({
            title: 'Build Error',
            error: error,
            text: 'There was an error building this page'
          }))
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
  }).listen(port)

  console.info(`Server running at http://localhost:${port}/`)
}
