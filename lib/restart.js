import { getJson } from './eleventy.js'

process.on('message', async (message) => {
  const { projectPath, query, permalink, user, repo } = message

  const result = await getJson({
    projectPath,
    templatePath: `${projectPath}${query.template}`,
    permalink,
    configPath: `${projectPath}/.eleventy.js`,
    baseUrl: `${user}/${repo}`,
  })

  if (result && result.content) {
    process.send({
      type: 'response',
      statusCode: 200,
      content: result.content
    })
  } else {
    process.send({
      type: 'response',
      statusCode: 404,
      content: `
        <h1>Page not found</h1>
        ${result ? result.error : 'Unknown error'}
      `
    })
  }
})
