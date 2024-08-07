import dotenv from 'dotenv'
import fs from 'fs'
import Eleventy from '@11ty/eleventy'

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

    console.info(`Generated ${all.length} pages`, all.map(item => item.url), permalink)
    const result = all.find(item => !permalink || permalink.replace(/\/$/, '') === item.url.replace(/\/$/, ''))

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
