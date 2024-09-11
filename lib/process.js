import { fork } from 'child_process'
import { read } from './cache.js'
const HTML_SERVER_SCRIPT = './lib/build-process.js'

export default async function run({ projectPath, permalink, query, user, repo }) {

  if (!query.template) {
    const cached = await read(user, repo)
    const page = cached?.get(permalink)
    if (!page) {
      console.error(`Page not found in cache for ${user}/${repo} permalink ${permalink}`)
    } else {
      return page
    }
  }
  return new Promise((resolve, reject) => {
    const child = fork(HTML_SERVER_SCRIPT, [], {
      env: process.env,
      stdio: 'inherit'
    })

    child.on('message', (message) => {
      if (message.type === 'response') {
        resolve(message)
      } else {
        console.error('Unknown message type', message)
        reject(new Error('Unknown message type'))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.send({
      projectPath,
      query,
      permalink,
      user,
      repo
    })
  })
}
