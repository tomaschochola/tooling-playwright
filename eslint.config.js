import { ESLintConfigBuilder, filePatterns } from '@tomaschochola/tooling-eslint';

const browserFiles = ['src/browser.js', 'tests/browser.test.js'];
const nodeFiles = ['src/{accessibility,assertions,config,index,page}.js', 'tests/**/*.js'];
const typescriptFiles = filePatterns.typescript;

export default new ESLintConfigBuilder()
    .addNodeGlobalsForConfigFiles()
    .addNodeGlobals({ files: nodeFiles })
    .addBrowserGlobals({ files: browserFiles })
    .addGitIgnoreFile(import.meta.url)
    .addJavaScriptRecommendedRules({ files: filePatterns.scripts })
    .addTypeScriptRecommendedTypeCheckedRules({ files: typescriptFiles })
    // .addTypeScriptStrictTypeCheckedRules({ files: typescriptFiles })
    // .addTypeScriptOpinionatedTypeCheckedRules({ files: typescriptFiles })
    .enableTypeScriptProjectService({ files: typescriptFiles })
    // .addSonarJsRecommendedRules({ files: filePatterns.scripts })
    .toConfig();
