import { spawn } from 'child_process'
import { queue } from './queue.js'
import { getCache, setCache } from './cache.js'
import { loadEnvFile } from 'process'

export default async function ({ projectPath, permalink, user, repo }) {
  const permalinkNoTrailingSlash = permalink.replace(/\/$/, '')
  console.log(`Discover ${user}/${repo}`)

  // If cache hit, serve from cache asynchronously and update cache
  const hit = await getCache(`${user}/${repo}`)
  console.log(`${user}/${repo}`)
  if (hit && hit.some(page => page.url === permalinkNoTrailingSlash)) {
    console.log(`Cache hit for ${user}/${repo}`)

    // Async cache update
    setTimeout(async () => {
      try {
        const pages = await discover({ projectPath })
        console.log(`Discovered ${pages.length} pages for ${user}/${repo}, updating cache`)
        const pagesNoTrailingSlash = pages.map(({url, inputPath}) => ({ inputPath, url: url.replace(/\/$/, '') }))
        console.log('update', `${user}/${repo}`)
        await setCache(`${user}/${repo}`, pagesNoTrailingSlash)
      } catch (error) {
        console.error(`Error discovering pages for ${user}/${repo}`, error)
      }
    }, 10000)

    // Return the cached content
    return hit.find(page => page.url === permalinkNoTrailingSlash).inputPath.replace(/^\./, '')
  } else {
    console.log(`Cache miss for ${user}/${repo}`)

    // Use queue to limit concurrent processes
    const pages = await queue.add(async () => discover({ projectPath }))

    console.log(`Discovered ${pages.length} pages for ${user}/${repo}, updating cache`)
    const pagesNoTrailingSlash = pages.map(({ url, inputPath }) => ({ inputPath, url: url.replace(/\/$/, '') }))
    console.log('discovered ', `${user}/${repo}` ,{pagesNoTrailingSlash})
    await setCache(`${user}/${repo}`, pagesNoTrailingSlash)

    const template = pagesNoTrailingSlash.find(page => page.url === permalinkNoTrailingSlash)?.inputPath.replace(/^\./, '')
    return template
  }
}

// Discover function that spawns `npx eleventy` and streams output
function discover({ projectPath }) {
  return new Promise((resolve, reject) => {
    loadEnvFile(`${projectPath}/preview.env`)
    const jsonPattern = /➡\s*(\[\{.*?\}\])\s*⬅/
    const eleventyProcess = spawn('npx', ['eleventy'], {
      cwd: projectPath,
      env: process.env,
    })

    // Load env vars from file
    eleventyProcess.env = process.env

    let output = ''
    let error = ''

    eleventyProcess.stdout.on('data', (data) => {
      console.log(data.toString().split('\n').join('\n>'))
      output += data.toString() // Stream output to avoid large memory usage
      const match = output.match(jsonPattern)
      if (match) {
        try {
          const extractedJson = JSON.parse(match[1])
          resolve(extractedJson) // Return the parsed JSON content
        } catch (parseError) {
          console.error('Failed to parse JSON:', parseError)
          reject(parseError)
        } finally {
          if (!eleventyProcess.killed) {
            eleventyProcess.kill()
          }
        }
      }
    })

    eleventyProcess.stderr.on('data', (data) => {
      console.error(`Eleventy stderr: ${data.toString()}`)
      error += `${data}\n`
    })

    eleventyProcess.on('error', (processError) => {
      console.error('Eleventy process error:', processError)
      reject(processError)
      if (!eleventyProcess.killed) {
        eleventyProcess.kill() // Ensure the process is killed on error
      }
    })

    eleventyProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Eleventy process exited with code ${code}. Stderr: ${error}`)
        reject(new Error(`Eleventy process exited with code ${code}.\n${error}`))
      }
      if (!eleventyProcess.killed) {
        eleventyProcess.kill() // Ensure the process is killed after exit
      }
    })
  })
}
