import { getJson } from './eleventy.js'
import response from './response.js'

process.on('message', async (message) => {
  const { projectPath, query, permalink, user, repo } = message
    console.log(message)
  if(!projectPath || !query || !permalink || !user || !repo) {
    console.error('Missing required parameters')
    process.send({
      type: 'response',
      statusCode: 500,
      content: response({
        title: 'Internal Server Error / Erreur Serveur',
        text: 'Missing required parameters / Paramètres manquants'
      })
    })
    return
  }

  if(!query.template) {
    console.error('Missing template parameter')
    process.send({
      type: 'response',
      statusCode: 500,
      content: response({
        title: 'Bad Request / Requête Incorrecte',
        text: `
          <p>You need to add a template parameter / Ajouter un paramètre template</p>
          <pre>Example: /user/repo?template=/path/to/template.html</pre>
          <p>The template file should be located in the <code>public/</code> directory of the site</p>
        `,
      })
    })
    return
  }

  const result = await getJson({
    projectPath,
    templatePath: `${projectPath}${query.template}`,
    permalink,
    configPath: `${projectPath}/.eleventy.js`,
    baseUrl: `${user}/${repo}`,
  })

  if(result && result.error) {
    console.error(`Error processing ${user}/${repo} permalink ${permalink}`, result.error)
    process.send({
      type: 'response',
      statusCode: 500,
      content: response({
        title: 'Build Error / Erreur de Compilation',
        error: result.error,
        text: 'There was an error building this page / une erreur est survenue lors de la construction de cette page'
      })
    })
  } else if (result && result.content) {
    process.send({
      type: 'response',
      statusCode: 200,
      content: result.content
    })
  } else {
    process.send({
      type: 'response',
      statusCode: 404,
      content: response({
        title: 'Page not found / Page introuvable',
        error: result.error,
        text: 'There was an error building this page / une erreur est survenue lors de la construction de cette page'
      })
    })
  }
})
