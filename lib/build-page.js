import { exec, fork } from 'child_process'
const HTML_SERVER_SCRIPT = './lib/build-process.js'

export default async function ({ projectPath, permalink, template, user, repo }) {

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
      template,
      permalink,
      user,
      repo
    })
  })
}
