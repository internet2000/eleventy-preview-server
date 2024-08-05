# Eleventy Preview Server

Serves 11ty websites in a 1 page preview mode

Features

* [x] Serve a single page with a preview of the 11ty website
* [x] The website data is fetched from a git repository
* [x] Build 1 template and returns its HTML for the given permalink
* [x] Web hook to clone or pull the repository
* [x] Launch eleventy in a child process in order to re-import all modules

## Usage

### Install

```bash
npm install
```

### Run

```bash
npm start
```

Then you can call the server with the following URL:

```
http://localhost:8080/{{user}}/{{project}}/{{permalink}}?template={{pathToTemplate}}&directusUrl={{directusUrl}}&defaultLanguage={{defaultLanguage}}&defaultCollection={{defaultCollection}}
```

For example, with the following URL:

```
http://localhost:8080/lexoyo/silex_directus-starter/en/ressource-en/?template=/public/all-tags-en.html&directusUrl=https://directus-starter-u465.vm.elestio.app&defaultLanguage=fr&defaultCollection=page
```

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