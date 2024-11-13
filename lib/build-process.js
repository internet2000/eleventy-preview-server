import { getJson } from './eleventy.js'

process.on('message', async (message) => {
  const { projectPath, template, permalink, user, repo } = message

  if(!projectPath || !user || !repo) {
    console.error('Missing required parameters')
    process.send({
      type: 'response',
      statusCode: 500,
      error: 'Missing required parameters / Paramètres manquants',
    })
    return
  }

  const result = await getJson({
    projectPath,
    templatePath: template ? `${projectPath}${template}` : undefined,
    permalink,
    configPath: `${projectPath}/.eleventy.js`,
    baseUrl: `${user}/${repo}`,
  })

  if(result && result.error) {
    console.error(`Error processing ${user}/${repo} permalink ${permalink}`, result.error, {result})
    process.send({
      type: 'response',
      statusCode: 500,
      error: 'There was an error building this page / une erreur est survenue lors de la construction de cette page',
    }) 
  } else if (result && result.content) {
    process.send({
      type: 'response',
      statusCode: 200,
      content: result.content
    })
  } else if (result && result.pages) {
    process.send({
      type: 'response',
      statusCode: 200,
      pages: result.pages,
    })
  } else {
    process.send({
      type: 'response',
      statusCode: 404,
      error: 'There was an error building this page / une erreur est survenue lors de la construction de cette page',
    })
  }
})
