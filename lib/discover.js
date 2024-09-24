import { spawn } from 'child_process'

const cache = new Map()

export default async function ({ projectPath, permalink, user, repo }) {
  const permalinkNoTrailingSlash = permalink.replace(/\/$/, '')
  console.log(`Discover ${user}/${repo}`)
  if (cache.has(`${user}/${repo}`) && cache.get(`${user}/${repo}`).some(page => page.url === permalinkNoTrailingSlash)) {
    console.log(`Cache hit for ${user}/${repo}`)
    // Update cache asuyncronously
    setTimeout(async () => {
      try {
        const pages = await discover({ projectPath })
        console.log(`Discovered ${pages.length} pages for ${user}/${repo}, updating cache`)
        const pagesNoTrailingSlash = pages.map(page => ({ ...page, url: page.url.replace(/\/$/, '') }))
        cache.set(`${user}/${repo}`, pagesNoTrailingSlash)
      } catch (error) {
        console.error(`Error discovering pages for ${user}/${repo}`, error)
      }
    }, 10000)
    // Returns the cached content
    return cache.get(`${user}/${repo}`).find(page => page.url === permalinkNoTrailingSlash).inputPath.replace(/^\./, '') // remove training dot that eleventy adds
  } else {
    console.log(`Cache miss for ${user}/${repo}`, cache.get(`${user}/${repo}`), permalinkNoTrailingSlash)
    // Discover pages and update cache
    const pages = await discover({ projectPath })
    console.log(`Discovered ${pages.length} pages for ${user}/${repo}, updating cache`)
    const pagesNoTrailingSlash = pages.map(page => ({ ...page, url: page.url.replace(/\/$/, '') }))
    cache.set(`${user}/${repo}`, pagesNoTrailingSlash)
    const template = pagesNoTrailingSlash.find(page => page.url === permalinkNoTrailingSlash)?.inputPath.replace(/^\./, '') // remove training dot that eleventy adds
    return template
  }
}
function discover({ projectPath }) {
  return new Promise((resolve, reject) => {
    // Regular expression to match the JSON pattern between the arrows ➡ and ⬅
    const jsonPattern = /➡\s*(\[\{.*?\}\])\s*⬅/;

    // Spawn the npx eleventy command
    try {
      const eleventyProcess = spawn('npx', ['eleventy'], { cwd: projectPath })

      // Listen for the output (stdout)
      eleventyProcess.stdout.on('data', (data) => {
        const output = data.toString() // Convert Buffer to string

        // Look for the JSON pattern in the output
        const match = output.match(jsonPattern)

        if (match) {
          try {
            // Extract the JSON content and parse it
            const extractedJson = JSON.parse(match[1])

            // return the JSON content
            resolve(extractedJson)

            // Kill the Eleventy process after finding the JSON
            eleventyProcess.kill()
          } catch (error) {
            console.error('Failed to parse JSON:', error)
            reject(error)
          }
        }
      })

      // Listen for any errors
      eleventyProcess.on('error', (error) => {
        console.error('Eleventy error:', error)
        reject(error)
      })
    } catch (error) {
      console.error('Failed to spawn Eleventy:', error)
      reject(error)
    }
  })
}
