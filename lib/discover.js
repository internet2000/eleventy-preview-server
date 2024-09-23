import { spawn } from 'child_process'

export default async function ({ projectPath, permalink, user, repo }) {
  return new Promise((resolve, reject) => {
    // Regular expression to match the JSON pattern between the arrows ➡ and ⬅
    const jsonPattern = /➡\s*(\[\{.*?\}\])\s*⬅/;

    // Spawn the npx eleventy command
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
  })
}
