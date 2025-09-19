const esbuild = require('esbuild');
const fs = require('fs-extra');

const isWatchMode = process.argv.includes('--watch');
const outdir = 'dist';

async function build() {
    try {
        // Clean the dist directory
        fs.emptyDirSync(outdir);

        // Run esbuild
        const context = await esbuild.context({
            entryPoints: [
                'src/background/serviceWorker.ts',
                'src/content/content.ts',
                'src/popup/popup.ts',
                'src/settings/settings.ts'
            ],
            bundle: true,
            outdir: outdir,
            outbase: 'src',
            format: 'iife', // Format that is safe for content scripts
            sourcemap: isWatchMode ? 'inline' : false,
            minify: !isWatchMode
        });

        // Copy all static files
        fs.copySync('manifest.json', `${outdir}/manifest.json`);
        fs.copySync('src/popup', `${outdir}/popup`, { filter: (src) => !src.endsWith('.ts') });
        fs.copySync('src/settings', `${outdir}/settings`, { filter: (src) => !src.endsWith('.ts') });
        fs.copySync('icons', `${outdir}/icons`);
        
        console.log('Build process started...');

        if (isWatchMode) {
            await context.watch();
            console.log('Watching for changes...');
        } else {
            await context.rebuild();
            await context.dispose();
            console.log('Build complete.');
        }
    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();