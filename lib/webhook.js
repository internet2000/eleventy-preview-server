import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { BASE_PATH, GITLAB_URL } from './config.js'

const execAsync = promisify(exec)

async function cloneOrPullRepo(user, repo) {
  const projectPath = `${BASE_PATH}/${user}/${repo}`
  const repoUrl = `git@${GITLAB_URL}:${user}/${repo}.git`

  if (existsSync(projectPath)) {
    console.log(`Pulling latest changes for ${repoUrl} into ${projectPath}`)
    await execAsync(`git -C ${projectPath} pull`)
    console.log(`Installing dependencies for ${projectPath}`)
    await execAsync(`npm install`, { cwd: projectPath });
  } else {
    console.log(`Cloning repository ${repoUrl} into ${projectPath}`)
    await execAsync(`git clone ${repoUrl} ${projectPath}`)
    console.log(`Installing dependencies for ${projectPath}`)
    await execAsync(`npm install`, { cwd: projectPath });
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
      res.writeHead(200, {
        'Content-Type': 'text/plain',
      })

      res.end('OK')
    } catch (error) {
      console.error('Error handling webhook:', error)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(`Internal Server Error ${error}`)
    }
  })
}
