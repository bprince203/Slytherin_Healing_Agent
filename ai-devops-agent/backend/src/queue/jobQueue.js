const queue = [];

export const enqueueJob = (job) => {
  queue.push(job);
  return queue.length;
};

export const dequeueJob = () => queue.shift();
export const getQueueSize = () => queue.length;
