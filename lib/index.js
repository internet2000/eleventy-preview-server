import blockedAt from 'blocked-at';
import { PORT } from './config.js'
import serve from './server.js'

serve(PORT)

if(process.env.ENABLE_METRICS) {
  console.info('Metrics enabled')
  setInterval(() => {
    console.log(`
      ---
      Uptime: ${process.uptime()}
      Memory Usage: ${JSON.stringify(process.memoryUsage())}
      CPU Usage: ${JSON.stringify(process.cpuUsage())}
      ---
    `);
  }, 60000)
}

if (process.env.ENABLE_BLOCKED_AT) {
  console.info('Blocked at enabled, do not use in production')
  blockedAt((time, stack) => {
    console.log(`Blocked for ${time}ms, operation started here:`, stack)
  })
}
