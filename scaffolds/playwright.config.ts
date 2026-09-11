import {
    createPlaywrightConfig,
    createPlaywrightDesktopProjects,
    // createPlaywrightBrandedDesktopProjects,
    // createPlaywrightPhoneProjects,
    // createPlaywrightTabletProjects,
} from '@tomaschochola/tooling-playwright';

export default createPlaywrightConfig({
    projects: [
        ...createPlaywrightDesktopProjects(),
        // ...createPlaywrightBrandedDesktopProjects(), // Requires Chrome and Edge installation.
        // ...createPlaywrightPhoneProjects(),
        // ...createPlaywrightTabletProjects(),
    ],
    testDir: '.',
    use: {
        baseURL: 'http://127.0.0.1:3000',
    },
    // webServer: {
    //     command: 'make serve',
    //     cwd: '../..',
    //     url: 'http://127.0.0.1:3000',
    // },
});
