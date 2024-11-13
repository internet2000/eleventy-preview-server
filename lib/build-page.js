import { fork } from 'child_process';
import { queue } from './queue.js';
const HTML_SERVER_SCRIPT = './lib/build-process.js';

// Custom error class with the complete logs
class BuildError extends Error {
  constructor(message, stdout, stderr) {
    super(message);
    this.stdout = stdout
    this.stderr= stderr
  }
}

function toLogString(arr) {
  return arr
    .map(line => line.split('\n').join('<br/>'))
    .join('<br/>')
}

export default async function ({ projectPath, permalink, template, user, repo }) {
  return queue.add(() => {
    let child;
    return new Promise((resolve, reject) => {
      child = fork(HTML_SERVER_SCRIPT, [], {
        env: process.env,
        //stdio: 'inherit',
        stdio: 'pipe',
      });

      // Listen for the message event to resolve the promise
      child.on('message', (message) => {
        if (message.type === 'response') {
          if(message.content) {
            resolve(message);
          } else {
            reject(new BuildError(message.error, toLogString(stdout), toLogString(stderr)));
          }
        } else {
          console.error(`Unknown message type: ${JSON.stringify(message)}`);
          reject(new BuildError('Unknown message type', toLogString(stdout), toLogString(stderr)));
        }
      });

      // Handle errors that occur in the child process
      child.on('error', (error) => {
        console.error('Child process error:', error);
        reject(new BuildError(error.message, toLogString(stdout), toLogString(stderr)));
      });

      // Ensure cleanup when the process exits
      child.on('exit', (code) => {
        console.error(`Child process exited with code ${code}`);
        if (code !== 0) {
          console.error(`Child process exited with code ${code}`);
          reject(new BuildError(`Child process exited with code ${code}`, toLogString(stdout), toLogString(stderr)));
        }
      });

      // Get all the logs from child
      let stdout = []
      let stderr = []
      child.stdout?.on('data', (data) => {
        console.info('>', data.toString().split('\n').join('\n>'));
        stdout.push(data.toString())
      });

      child.stderr?.on('data', (data) => {
        console.error('>', data.toString().split('\n').join('\n>'));
        stderr.push(data.toString())
      })

      // Send initial data to the child process
      child.send({
        projectPath,
        template,
        permalink,
        user,
        repo,
      });

    }).finally(() => {
      // Ensure the child process is killed no matter what happens
      if (child && !child.killed) {
        child.kill();
      }
    });
  });
}
