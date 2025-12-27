function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function promisePool(items, worker, { concurrency = 4 } = {}) {
  const results = new Array(items.length);
  let index = 0;
  const executing = new Set();

  async function enqueue() {
    if (index >= items.length) {
      return;
    }
    const currentIndex = index++;
    const task = (async () => worker(items[currentIndex], currentIndex))()
      .then(result => {
        results[currentIndex] = result;
      });

    executing.add(task);
    task.finally(() => executing.delete(task));

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }

    return enqueue();
  }

  await enqueue();
  await Promise.allSettled(executing);
  return results;
}

module.exports = {
  delay,
  promisePool
};
