import dotenv from 'dotenv'
import fs from 'fs'
import Eleventy from '@11ty/eleventy'

// FIXME: why not use dotenv.config() or process::loadEnvFile()?
export function loadEnvVars(envPath) {
  const env = {}
  if(fs.existsSync(envPath)) {
    console.info('env vars found:', envPath)
    // Get the environment variables from the file
    const envConfig = dotenv.parse(fs.readFileSync(envPath, 'utf8'))
    // Replace placeholders with environment variables
    // Set the environment variables
    Object.keys(envConfig).forEach((key) => {
      const value = envConfig[key];

      // Replace placeholders with environment variables
      const resolvedValue = value.replace(/\${(.*?)}/g, (_, varName) => {
        return process.env[varName] || '';
      });

      // Resolve default values syntax ${VAR:-default}
      envConfig[key] = resolvedValue.replace(/\${(.*?):-(.*?)}/g, (_, varName, defaultValue) => {
        return process.env[varName] || defaultValue;
      });

      // Set the environment variables
      process.env[key] = envConfig[key];
      env[key] = envConfig[key]
    });
  } else {
    console.info('No env file found at', envPath)
  }
  return env
}

export function initEnvVars(opts) {
  const { templatePath, projectPath, configPath, baseUrl } = opts
  // These can be used in .env and preview.env files
  process.TEMPLATE_PATH = templatePath
  process.PROJECT_PATH = projectPath
  process.CONFIG_PATH = configPath
  process.BASE_URL = baseUrl
  // Load website environment variables
  loadEnvVars(`${projectPath}/.env`, opts)
  // dotenv.config({ path: `${projectPath}/.env` })
  // Override some environment variables for preview
  process.env.SILEX_FS_HOSTING_ROOT = templatePath
  process.env.BASE_URL = baseUrl
  loadEnvVars(`${projectPath}/preview.env`, opts)
}

export async function getJson(opts) {
  try {
    const {
      projectPath,
      templatePath,
      configPath,
      permalink,
      baseUrl,
    } = opts
    // Check inputs
    if (!templatePath) {
      return { error: 'Missing templatePath' }
    }
    if (!configPath) {
      return { error: 'Missing configPath' }
    }
    if (!projectPath) {
      return { error: 'Missing projectPath' }
    }
    // CD to the project path, this is useful when eleventy plugins read the filesystem
    process.chdir(projectPath)

    // Sets the base env vars
    initEnvVars({ templatePath, projectPath, configPath, baseUrl })
    
    const options = {
      input: templatePath,
      output: '/tmp/eleventy',
      config: configPath,
      configPath,
      isServerless: true,
    }
    const eleventy = new Eleventy(templatePath, '', options)

    const all = await eleventy.toJSON()
    if (!all || all.length === 0) {
      return { error: 'No pages generated' }
    }

    const pages = all.map(item => ({
      ...item,
      url: item.url.replace(/\/$/, ''),
    }))

    console.info(`Generated ${pages.length} pages`, pages.map(item => item.url), permalink)

    // Handle the case where all pages are requested
    if(!permalink) {
      console.info('No permalink provided => returning all pages')
      return { pages }
    }

    // Get an array of all permalinks possible, unpacking the ['a', 'b'] in the permalink
    // @example permalink = `/blog/['name-en', 'name-fr']/` => ['/blog/name-en/', '/blog/name-fr/']
    const allPermalinks = (
      permalink.match(/\[.*?\]/g)?.reduce(
        (acc, match) => acc.flatMap(link => JSON.parse(match).map((p) => link.replace(match, p))),
        [permalink]
      ) ?? [permalink]
    )
    .map(permalink => permalink.replace(/\/$/, ''))
    console.info(`All permalinks:`, allPermalinks)

    const result = pages.find(item => allPermalinks.includes(item.url))

    if (!result) {
      return {
        error: `
          <span>Page not found for permalink \`${permalink}\` with template \`${templatePath}\`. Found pages:</span>
          <ul>${pages.map(item => `<li>${item.url}</li>`).join('')}</ul>`,
      }
    }

    return result
  } catch (e) {
    console.error('Catched error in getJson()', e, e.originalError)
    return { error: `${ e.message }\n${ e.originalError?.message || ''}` }
  }
}
