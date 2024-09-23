# Eleventy Preview Server

A script that serves your 11ty site by rendering only the requested pages

Features

* [x] Serve a single page with a preview of the 11ty website
* [x] The website data is fetched from a git repository
* [x] Build 1 template and returns its HTML for the given permalink
* [x] Web hook to clone or pull the repository
* [x] Launch eleventy in a child process in order to re-import all modules
* [x] Build the website beforehand if needed

## Usage

### Install

```bash
npm install
```

### Run

```bash
npm start
```

### API

First you will need to pull the website repository:

```
http://localhost:8080/.pull/{{user}}/{{project}}/
```

Then you can call the server with the following URL:

```
http://localhost:8080/{{user}}/{{project}}/{{permalink}}?template={{pathToTemplate}}&directusUrl={{directusUrl}}&defaultLanguage={{defaultLanguage}}&defaultCollection={{defaultCollection}}
```

For example, with the following URL:

```
http://localhost:8080/lexoyo/silex_directus-starter/en/ressource-en/?template=/public/all-tags-en.html&directusUrl=https://directus-starter-u465.vm.elestio.app&defaultLanguage=fr&defaultCollection=page
```

### Auto-discovery mode

A website can be previewd in auto-discovery mode by adding the `.auto` prefix to the URL. This will automatically find the template for the URL:
```
http://localhost:8080/.auto/lexoyo/silex_directus-starter/en/ressource-en/
```

For this to work, you need to provide the list of all pages with their corresponding templates to the server. This requires you to add an 11ty plugin to your 11ty configuration file:

```js
import { PreviewPlugin } from '@internet2000/eleventy-preview-server/plugin'
module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(PreviewPlugin)
};
```

What this does is:

```js
  // This is the 11ty preview plugin, do not add it to your project, add the plugin instead
  eleventyConfig.addCollection('preview', async function (collectionApi) {
    // Output the URL and template of each page
    // Mark the beginning and end of the collection with an arrow to make it easy to extract the list from the log
    console.log('➡',
      JSON.stringify(collectionApi.getAll().map(item => ({
        url: item.url,
        inputPath: item.inputPath,
      }))),
      '⬅')
    return collectionApi.getAll()
  })
```

When the preview server runs the build, it will extract the list of all pages and their corresponding templates from the log and use it to serve the pages.

As soon as the pages are extracted, the process is killed so that the build never actually runs. 

### Configuration

The server is configured using environment variables:

* `PORT` - The port to run the server on (default: 8080)
* `GITLAB_URL` - The URL of the GitLab server (default: gitlab.com) - should also work with any other git based SaaS
* `LOCAL_REPO_PATH` - The path to the local repositories (default: `/tmp/previews`)

Here are environment variables defined by this script before building a template:

* `TEMPLATE_PATH` - The path to the template file, relative to the project root, for example `/public/all-tags-en.html`
* `PROJECT_PATH` - The path to the project repository, for example `lexoyo/silex_directus-starter`
* `CONFIG_PATH` - The path to the configuration file, for example `/.eleventy.js`
* `BASE_URL` - The base path of the website, for example `/lexoyo/silex_directus-starter/`

You can use those environment variables in your `.env` file (`MY_FOLDER=${PROJECT_PATH}/my-folder`) as well as in your eleventy config (`process.env.PROJECT_PATH`).

Also you can create a `preview.env` file in the root of your project to define the environment variables for the preview only and override the values from `.env`.