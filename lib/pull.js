import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { GITLAB_URL } from './config.js'
import response from './response.js'
import run from './build-page.js'
import { readdir } from 'fs/promises'

const execAsync = promisify(exec)

// Mechanism to debounce pulls
const pullQueue = new Set()
const nextPull = new Set()

async function wait(ms = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function cloneOrPullRepo(user, repo, projectPath) {
  const repoUrl = `git@${GITLAB_URL}:${user}/${repo}.git`

  if(pullQueue.has(projectPath)) {
    console.log(`\u001b[33m${user}/${repo} is already being updated\u001b[0m`)
    nextPull.add(projectPath)
    return
  }
  pullQueue.add(projectPath)
  try {
    if (existsSync(projectPath)) {
      console.info(`Resetting ${projectPath} to latest commit`)
      console.log(`\u001b[2mgit -C ${projectPath} reset --hard\u001b[0m`)
      const resetOutput = await execAsync(`git -C ${projectPath} reset --hard`)
      console.log(`\u001b[2m${resetOutput.stdout} ${resetOutput.stderr}\u001b[0m`)
      console.info(`Pulling latest changes for ${repoUrl} into ${projectPath}`)
      console.log(`\u001b[2mgit -C ${projectPath} pull --rebase origin main\u001b[0m`)
      const gitOutput = await execAsync(`git -C ${projectPath} pull --rebase origin main`)
      console.log(`\u001b[2m${gitOutput.stdout} ${gitOutput.stderr}\u001b[0m`)
      console.info(`Installing dependencies for ${projectPath}`)
      console.log(`\u001b[2mnpm install\u001b[0m`)
      const npmOutput = await execAsync(`npm install`, { cwd: projectPath });
      console.log(`\u001b[2m${npmOutput.stdout} ${npmOutput.stderr}\u001b[0m`)
      console.info(`\u001b[32m${user}/${repo} updated successfully\u001b[0m`)
    } else {
      console.info(`Cloning repository ${repoUrl} into ${projectPath}`)
      console.log(`\u001b[2mgit clone ${repoUrl} ${projectPath}\u001b[0m`)
      const gitOutput = await execAsync(`git clone ${repoUrl} ${projectPath}`)
      console.log(`\u001b[2m${gitOutput.stdout} ${gitOutput.stderr}\u001b[0m`)
      console.info(`Installing dependencies for ${projectPath}`)
      console.log(`\u001b[2mnpm install\u001b[0m`)
      const npmOutput = await execAsync(`npm install`, { cwd: projectPath });
      console.log(`\u001b[2m${npmOutput.stdout} ${npmOutput.stderr}\u001b[0m`)
      console.info(`\u001b[32m${user}/${repo} cloned successfully\u001b[0m`)
    }
  } catch (error) {
    console.error(`\u001b[31mError cloning or pulling ${user}/${repo}:\u001b[0m`, error)
    return new Error(`Error cloning or pulling ${user}/${repo}: ${error}`)
  }
  await wait()
  pullQueue.delete(projectPath)
  if (nextPull.has(projectPath)) {
    nextPull.delete(projectPath)
    return cloneOrPullRepo(user, repo, projectPath)
  }
}

async function discover({ projectPath, user, repo, query }) {
  // List the files in query.discover
  const files = await Promise.all(
    (await readdir(`${projectPath}${query.discover}`))
      .filter(file => file.endsWith('.html'))
  )

  const pages = new Map()
  for (const file of files) {
    console.log(`\u001b[32mDiscovering ${file}\u001b[0m`)
    const folder = query.discover.endsWith('/') ? query.discover : `${query.discover}/`
    const template = `${folder}${file}`
    const templateQuery = { template }
    const result = await run({ projectPath, query: templateQuery, permalink: null, user, repo })
    console.log(`\u001b[2m${result.pages.map(page => page.url)} ${result.stderr}\u001b[0m`)
    if(result && result.pages) {
      for (const page of result.pages) {
        const withSlash = page.url.endsWith('/') ? page.url : `${page.url}/`
        pages.set(withSlash, page)
      }
    }
  }
  return pages
}

export default async function(req, res, { user, repo, projectPath, query }) {
  let body = ''

  req.on('data', chunk => {
    body += chunk.toString()
  })

  req.on('end', async () => {
    try {
      console.log(`Received webhook for ${user}/${repo}`, req.url, query)

      console.log(`\u001b[32mUpdating ${user}/${repo}\u001b[0m`)
      const err = await cloneOrPullRepo(user, repo, projectPath)

      if (err) {
        console.error('Error cloning or pulling repository:', err)
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end(response({
          title: 'Error updating repository',
          text: `There was an error updating ${user}/${repo}`,
          error: err
        }))
        return
      } else {
        // Discover all templates and the pages they generate
        if(query && query.discover) {
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
      }
    } catch (error) {
      console.error('Error handling webhook:', error)
      res.writeHead(500, { 'Content-Type': 'text/html' })
      res.end(response({
        title: 'Error handling webhook',
        text: 'There was an error handling the webhook',
        error,
      }))
    }
  })
}
