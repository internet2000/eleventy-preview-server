
/**
 * Extract variables from a URL string and return the URL without variables
 * @param {string} url A URL string that may contain environment variables in the format /VAR_NAME=value/
 * @returns {Array} An array containing the URL without variables and an array of the extracted variable names
 */
export function splitVarsInUrl(url) {
  const regex = /\/([a-zA-Z_][a-zA-Z0-9_]*)=([^/]+)/g;
  const variables = {};
  const urlWithoutVars = url.replace(regex, (match, varName, varValue) => {
      variables[varName] = varValue;
      return '';
  }).replace(/\/{2,}/g, '/'); // Remove any double slashes
  console.log('splitVarsInUrl', { url, urlWithoutVars, variables });
  return [urlWithoutVars, variables];
}
