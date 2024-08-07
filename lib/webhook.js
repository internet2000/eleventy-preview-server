import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { LOCAL_REPO_PATH, GITLAB_URL } from './config.js'

const execAsync = promisify(exec)

async function cloneOrPullRepo(user, repo) {
  const projectPath = `${LOCAL_REPO_PATH}/${user}/${repo}`
  const repoUrl = `git@${GITLAB_URL}:${user}/${repo}.git`

  try {
    if (existsSync(projectPath)) {
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
