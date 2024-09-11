const cache = new Map()
export async function store(user, repo, pages) {
  console.log(`\u001b[33mStoring ${pages.size} pages in cache for ${user}/${repo}\u001b[0m`)
  const cacheKey = `${user}/${repo}`
  if (cache.has(cacheKey)) {
    console.log(`\u001b[33mRemoving cache for ${cacheKey}\u001b[0m`)
    cache.delete(cacheKey)
  }
  cache.set(cacheKey, pages)
}

export async function read(user, repo) {
  return cache.get(`${user}/${repo}`)
}

export async function clear(user, repo) {
  console.log(`\u001b[33mClearing cache for ${user}/${repo}\u001b[0m`)
  cache.delete(`${user}/${repo}`)
}