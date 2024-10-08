import { spawn } from 'child_process'
import queue from './queue.js'

const cache = new Map();

export default async function ({ projectPath, permalink, user, repo }) {
  const permalinkNoTrailingSlash = permalink.replace(/\/$/, '')
  console.log(`Discover ${user}/${repo}`)

  // If cache hit, serve from cache asynchronously and update cache
  if (cache.has(`${user}/${repo}`) && cache.get(`${user}/${repo}`).some(page => page.url === permalinkNoTrailingSlash)) {
    console.log(`Cache hit for ${user}/${repo}`)

    // Async cache update
    setTimeout(async () => {
      try {
        const pages = await discover({ projectPath })
        console.log(`Discovered ${pages.length} pages for ${user}/${repo}, updating cache`)
        const pagesNoTrailingSlash = pages.map(({url, inputPath}) => ({ inputPath, url: url.replace(/\/$/, '') }))
        cache.set(`${user}/${repo}`, pagesNoTrailingSlash)
      } catch (error) {
        console.error(`Error discovering pages for ${user}/${repo}`, error)
      }
    }, 10000)

    // Return the cached content
    return cache.get(`${user}/${repo}`).find(page => page.url === permalinkNoTrailingSlash).inputPath.replace(/^\./, '')
  } else {
    console.log(`Cache miss for ${user}/${repo}`)

    // Use queue to limit concurrent processes
    const pages = await queue.add(() => discover({ projectPath }))

    console.log(`Discovered ${pages.length} pages for ${user}/${repo}, updating cache`)
    const pagesNoTrailingSlash = pages.map(({ url, inputPath }) => ({ inputPath, url: url.replace(/\/$/, '') }))
    cache.set(`${user}/${repo}`, pagesNoTrailingSlash)

    const template = pagesNoTrailingSlash.find(page => page.url === permalinkNoTrailingSlash)?.inputPath.replace(/^\./, '')
    return template
  }
}

// Discover function that spawns `npx eleventy` and streams output
function discover({ projectPath }) {
  return new Promise((resolve, reject) => {
    const jsonPattern = /➡\s*(\[\{.*?\}\])\s*⬅/
    const eleventyProcess = spawn('npx', ['eleventy'], { cwd: projectPath })

    let output = ''
    let error = ''

    eleventyProcess.stdout.on('data', (data) => {
      output += data.toString() // Stream output to avoid large memory usage
      const match = output.match(jsonPattern)
      if (match) {
        try {
          const extractedJson = JSON.parse(match[1])
          resolve(extractedJson) // Return the parsed JSON content
        } catch (error) {
          console.error('Failed to parse JSON:', error)
          reject(error)
        } finally {
          eleventyProcess.kill() // Ensure the process is killed
        }
      }
    })

    eleventyProcess.stderr.on('data', (data) => {
      console.error(`Eleventy stderr: ${data.toString()}`)
      error += `${data}\n`
    })

    eleventyProcess.on('error', (err) => {
      console.error('Eleventy process error:', err)
      reject(err)
      eleventyProcess.kill() // Ensure the process is killed on error
    })

    eleventyProcess.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Eleventy process exited with code ${code}.\n${error}`))
      }
      eleventyProcess.kill() // Ensure the process is killed after exit
    })
  })
}
