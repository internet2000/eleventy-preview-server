import blockedAt from 'blocked-at';
import { PORT } from './config.js'
import serve from './server.js'

serve(PORT)

if(process.env.ENABLE_METRICS) {
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
  blockedAt((time, stack) => {
    console.log(`Blocked for ${time}ms, operation started here:`, stack)
  })
}
