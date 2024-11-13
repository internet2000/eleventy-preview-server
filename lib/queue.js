import PQueue from 'p-queue';

export const queue = new PQueue({
  concurrency: parseInt(process.env.CONCURRENT_OPERATIONS || "2"),
  timeout: parseInt(process.env.OPERATION_TIMEOUT || "60000"),
  throwOnTimeout: true,
});
