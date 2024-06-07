import Eleventy from '@11ty/eleventy';

const PROJECT_PATH = '/home/lexoyo/_/i2k-meta/projects3/directus-starter';
const TEMPLATE_PATH = `${PROJECT_PATH}/public/blog-en.html`;
const CONFIG_PATH = `${PROJECT_PATH}/.eleventy.js`;
const DIRECTUS_URL = 'https://directus-starter-u465.vm.elestio.app';
const DEFAULT_COLLECTION = 'page';
const LANGUAGES_DEFAULT = 'fr';

export async function getJson({
  templatePath = TEMPLATE_PATH,
  configPath = CONFIG_PATH,
  permalink,
  directusUrl = DIRECTUS_URL,
  defaultCollection = DEFAULT_COLLECTION,
  languagesDefault = LANGUAGES_DEFAULT,
}) {
  process.env.SILEX_FS_HOSTING_ROOT = templatePath;
  process.env.DIRECTUS_URL = directusUrl;
  process.env.LANGUAGES_DEFAULT = languagesDefault;
  process.env.DEFAULT_COLLECTION = defaultCollection;

  try {
    const eleventy = new Eleventy(templatePath, '', {
      input: templatePath,
      output: '/tmp/eleventy',
      config: configPath,
      configPath,
      isServerless: true,
    });

    const all = await eleventy.toJSON();
    if (!all || all.length === 0) {
      return { error: 'No pages generated' };
    }

    console.info(`Generated ${all.length} pages`, all.map(item => item.url));
    const result = all.find(item => !permalink || permalink === item.url);

    if (!result) {
      return {
        error: `
          <span>Page not found for permalink \`${permalink}\` with template \`${templatePath}\`. Found pages:</span>
          <ul>${all.map(item => `<li>${item.url}</li>`).join('')}</ul>`,
      };
    }

    console.log('Found:', result.url);
    return result;
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
}
