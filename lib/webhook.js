import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { BASE_PATH, GITLAB_URL } from './config.js'

const execAsync = promisify(exec)

async function cloneOrPullRepo(user, repo) {
  const projectPath = `${BASE_PATH}/${user}/${repo}`
  const repoUrl = `git@${GITLAB_URL}:${user}/${repo}.git`

  try {
    if (existsSync(projectPath)) {
      console.log(`Pulling latest changes for ${repoUrl} into ${projectPath}`)
      await execAsync(`git -C ${projectPath} pull`)
      console.log(`Installing dependencies for ${projectPath}`)
      await execAsync(`npm install`, { cwd: projectPath });
      console.info(`\u001b[32m${user}/${repo} updated successfully\u001b[0m`)
    } else {
      console.log(`Cloning repository ${repoUrl} into ${projectPath}`)
      await execAsync(`git clone ${repoUrl} ${projectPath}`)
      console.log(`Installing dependencies for ${projectPath}`)
      await execAsync(`npm install`, { cwd: projectPath });
      console.info(`\u001b[32m${user}/${repo} cloned successfully\u001b[0m`)
    }
  } catch (error) {
    console.error(`\u001b[31mError cloning or pulling ${user}/${repo}:\u001b[0m`, error)
  }
}

export async function handleWebhook(req, res) {
  let body = ''

  req.on('data', chunk => {
    body += chunk.toString()
  })

  req.on('end', async () => {
    try {
      const [,, user, repo] = req.url.split('/')
      console.log(`Received webhook for ${user}/${repo}`, req.url)

      // We don't await this because we don't want to block the response
      /*await */cloneOrPullRepo(user, repo)

      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('OK')
    } catch (error) {
      console.error('Error handling webhook:', error)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(`Internal Server Error ${error}`)
    }
  })
}
