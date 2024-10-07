import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: process.env.CONCURRENT_OPERATIONS || 2 });

export default queue
