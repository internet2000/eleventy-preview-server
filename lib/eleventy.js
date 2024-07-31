import Eleventy from '@11ty/eleventy'
import dotenv from 'dotenv'
import fs from 'fs'

function loadEnvVars(envPath, { templatePath, projectPath, configPath, baseUrl }) {
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
    });
  } else {
    console.info('No env file found at', envPath)
  }
}

export async function getJson(options) {
  try {
    const {
      projectPath,
      templatePath,
      configPath,
      permalink,
      baseUrl,
    } = options
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
    // These can be used in .env and preview.env files
    process.TEMPLATE_PATH = templatePath
    process.PROJECT_PATH = projectPath
    process.CONFIG_PATH = configPath
    process.BASE_URL = baseUrl
    // Load website environment variables
    loadEnvVars(`${projectPath}/.env`, options)
    // dotenv.config({ path: `${projectPath}/.env` })
    // Override some environment variables for preview
    process.env.SILEX_FS_HOSTING_ROOT = templatePath
    process.env.BASE_URL = baseUrl
    loadEnvVars(`${projectPath}/preview.env`, options)
    
    // console.log('env variables:', {
    //   SILEX_FS_HOSTING_ROOT: process.env.SILEX_FS_HOSTING_ROOT,
    //   BASE_URL: process.env.BASE_URL,
    //   DIRECTUS_URL: process.env.DIRECTUS_URL,
    //   DEFAULT_COLLECTION: process.env.DEFAULT_COLLECTION,
    //   LANGUAGES_DEFAULT: process.env.LANGUAGES_DEFAULT,
    //   LANGUAGES_DEFAULT_KEEP_IN_PATH: process.env.LANGUAGES_DEFAULT_KEEP_IN_PATH,
    //   NODE_ENV: process.env.NODE_ENV,
    //   IS_LIVE: process.env.IS_LIVE,
    //   PLUGIN_IMAGE: process.env.PLUGIN_IMAGE,
    // })

    const options = {
      input: templatePath,
      output: '/tmp/eleventy',
      config: configPath,
      configPath,
      isServerless: true,
    }
    console.log('Eleventy options:', options)
    const eleventy = new Eleventy(templatePath, '', options)

    const all = await eleventy.toJSON()
    if (!all || all.length === 0) {
      return { error: 'No pages generated' }
    }

    console.info(`Generated ${all.length} pages`, all.map(item => item.url), permalink)
    const result = all.find(item => !permalink || permalink === item.url)

    if (!result) {
      return {
        error: `
          <span>Page not found for permalink \`${permalink}\` with template \`${templatePath}\`. Found pages:</span>
          <ul>${all.map(item => `<li>${item.url}</li>`).join('')}</ul>`,
      }
    }

    return result
  } catch (e) {
    console.error(e)
    return { error: e.message }
  }
}
