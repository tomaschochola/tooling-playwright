/**
 * @file
 * @author Tomáš Chochola <tomaschochola@tomaschochola.cz>
 * @copyright © 2026 Tomáš Chochola <tomaschochola@tomaschochola.cz>
 *
 * @license CC-BY-ND-4.0
 *
 * @see {@link https://creativecommons.org/licenses/by-nd/4.0/} License
 * @see {@link https://github.com/tomaschochola} GitHub Profile
 * @see {@link https://github.com/sponsors/tomaschochola} GitHub Sponsors
 */

import { ESLintConfigBuilder, filePatterns } from '@tomaschochola/tooling-eslint';

const javascriptFiles = filePatterns.allJavaScriptFiles;
const typescriptFiles = filePatterns.allTypeScriptFiles;

export default new ESLintConfigBuilder()
    .addNodeGlobals({ files: ['*.js', 'src/{accessibility,assertions,config,index,page}.js', 'tests/**/*.js'] })
    .addBrowserGlobals({ files: ['src/browser.js', 'tests/browser.test.js'] })
    .addGitIgnoreFile(import.meta.url)
    .addJavaScriptRecommendedRules()
    .addTypeScriptStrictTypeCheckedRules({ files: typescriptFiles })
    .enableTypeScriptProjectService({ files: typescriptFiles })
    .disableTypeScriptTypeChecking({ files: javascriptFiles })
    .addSonarJsRecommendedRules()
    .toConfig();
