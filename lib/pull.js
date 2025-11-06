import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { GITLAB_URL } from './config.js'
import response from './response.js' // Keep the response function
import run from './build-page.js' // Keep the run function
import { readdir, rm } from 'fs/promises' // Reintroduced readdir and rm
import { queue } from './queue.js'

const execAsync = promisify(exec)

// Mechanism to debounce pulls
const pullQueue = new Set()
const nextPull = new Set()

async function wait(ms = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const execAsyncWithTimeout = (command, options = {}, timeout = 60000) => {
  return Promise.race([
    execAsync(command, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Command timed out: ${command}`)), timeout)
    ),
  ])
}

async function cloneOrPullRepo(user, repo, projectPath) {
  const repoUrl = `git@${GITLAB_URL}:${user}/${repo}.git`

  return queue.add(async () => {
    if (pullQueue.has(projectPath)) {
      console.log(`\u001b[33m${user}/${repo} is already being updated\u001b[0m`)
      nextPull.add(projectPath)
      return
    }
    pullQueue.add(projectPath)
    try {
      if (existsSync(projectPath) && !existsSync(`${projectPath}/.git`)) {
        console.error(`\u001b[31m${projectPath} exists but is not a git repository, deleting directory\u001b[0m`)
        await rm(projectPath, { recursive: true })
      }

      if (existsSync(projectPath)) {
        console.info(`Pulling latest changes for ${repoUrl}`)

        // Get current commit hash before fetch/reset
        const { stdout: oldCommit } = await execAsyncWithTimeout(`git -C ${projectPath} rev-parse HEAD`)

        await execAsyncWithTimeout(`git -C ${projectPath} fetch origin main`)
        await execAsyncWithTimeout(`git -C ${projectPath} reset --hard origin/main`)

        // Get new commit hash after reset
        const { stdout: newCommit } = await execAsyncWithTimeout(`git -C ${projectPath} rev-parse HEAD`)

        // Only check for dependency changes if commit changed
        if (oldCommit.trim() !== newCommit.trim()) {
          const diffOutput = await execAsyncWithTimeout(
            `git -C ${projectPath} diff --name-only ${oldCommit.trim()} ${newCommit.trim()} -- package.json package-lock.json`
          )
          if (diffOutput.stdout) {
            console.info('Changes in dependencies detected. Running npm install...')
            await execAsyncWithTimeout(`npm install`, { cwd: projectPath })
          }
        }
      } else {
        console.info(`Cloning repository ${repoUrl} into ${projectPath}`)
        await execAsyncWithTimeout(`git clone ${repoUrl} ${projectPath}`)
        console.info(`Installing dependencies for ${projectPath}`)
        await execAsyncWithTimeout(`npm ci`, { cwd: projectPath })
      }
    } catch (error) {
      console.error(`Error cloning or pulling ${user}/${repo}:`, error)
      throw new Error(`Error cloning or pulling ${user}/${repo}: ${error.message}`)
    } finally {
      pullQueue.delete(projectPath)
    }
  })
}

async function discover({ projectPath, user, repo, query }) {
  // List the files in query.discover
  const files = await readdir(`${projectPath}${query.discover}`)

  const pages = new Map()
  for (const file of files.filter(file => file.endsWith('.html'))) {
    console.log(`\u001b[32mDiscovering ${file}\u001b[0m`)
    const folder = query.discover.endsWith('/') ? query.discover : `${query.discover}/`
    const template = `${folder}${file}`
    const templateQuery = { template }
    const result = await run({ projectPath, query: templateQuery, permalink: null, user, repo })
    console.log(`\u001b[2m${result.pages.map(page => page.url)} ${result.stderr}\u001b[0m`)
    if (result && result.pages) {
      for (const page of result.pages) {
        const withSlash = page.url.endsWith('/') ? page.url : `${page.url}/`
        pages.set(withSlash, page)
      }
    }
  }
  return pages
}

// Handle webhook request
export default async function(req, res, { user, repo, projectPath, query }) {
  let body = ''

  req.on('data', chunk => {
    body += chunk.toString()
  })

  req.on('end', async () => {
    try {
      console.log(`Received webhook for ${user}/${repo}`, req.url, query)

      console.log(`\u001b[32mUpdating ${user}/${repo}\u001b[0m`)
      await cloneOrPullRepo(user, repo, projectPath)

      // Discover all templates and the pages they generate
      if (query && query.discover) {
        console.log(`\u001b[32mDiscovering templates for ${user}/${repo}\u001b[0m`)
        const pages = await discover({ projectPath, user, repo, query })
        console.log(`\u001b[2mDiscovered ${pages.size} templates for ${user}/${repo}\u001b[0m`)
      }
      console.log(`\u001b[32m${user}/${repo} updated successfully\u001b[0m`)
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(response({
        title: 'Repository updated',
        text: `Successfully updated ${user}/${repo}`
      }))
    } catch (error) {
      console.error('Error handling webhook:', error)
      res.writeHead(500, { 'Content-Type': 'text/html' })
      res.end(response({
        title: 'Error updating repo',
        text: 'There was an error handling the webhook',
        error,
      }))
    }
  })
}

export async function cleanupPulls(reposDir) {
  queue.clear()
  pullQueue.clear()
  nextPull.clear()
  // Check all the repos
  const orgs = await readdir(reposDir)
  for(const org of orgs) {
    const orgPath = `${reposDir}/${org}`
    console.info(`Found org ${orgPath}`)
    const projects = await readdir(orgPath)
    for (const project of projects) {
      const projectPath = `${orgPath}/${project}`
      console.info(`Found ${projectPath}`)
      if (existsSync(`${projectPath}/.git`)) {
        console.info(`Cleaning up ${projectPath}`)
        // Remove git lock file
        console.info(`Removing git lock file`)
        await rm(`${projectPath}/.git/index.lock`, { force: true })
        // Do npm install
        console.info(`Running npm install`)
        const npmOutput = await execAsyncWithTimeout(`npm install`, { cwd: projectPath })
        console.log(`\u001b[2m${npmOutput.stdout} ${npmOutput.stderr}\u001b[0m`)
      }
    }
  }
  console.info('Cleanup complete')
}
