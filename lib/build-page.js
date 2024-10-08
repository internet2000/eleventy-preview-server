import { fork } from 'child_process';
import queue from './queue.js';
const HTML_SERVER_SCRIPT = './lib/build-process.js';

export default async function ({ projectPath, permalink, template, user, repo }) {
  return queue.add(() => {
    let child;
    return new Promise((resolve, reject) => {
      child = fork(HTML_SERVER_SCRIPT, [], {
        env: process.env,
        stdio: 'inherit',
      });

      // Listen for the message event to resolve the promise
      child.on('message', (message) => {
        if (message.type === 'response') {
          resolve(message);
        } else {
          console.error('Unknown message type', message);
          reject(new Error('Unknown message type'));
        }
      });

      // Handle errors that occur in the child process
      child.on('error', (error) => {
        reject(error);
      });

      // Ensure cleanup when the process exits
      child.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Child process exited with code ${code}`));
        }
      });

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
      if (!child.killed) {
        child.kill();
      }
    });
  });
}
