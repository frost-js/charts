import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    const isUmd = mode === 'umd';

    return {
        build: {
            emptyOutDir: !isUmd,
            lib: {
                entry: isUmd ? 'src/browser.js' : 'src/index.js',
                name: 'Chart',
            },
            minify: false,
            outDir: 'dist',
            rolldownOptions: {
                output: isUmd ? [
                    {
                        entryFileNames: 'frost-charts.js',
                        format: 'umd',
                        minify: false,
                        name: 'Chart',
                    },
                    {
                        entryFileNames: 'frost-charts.min.js',
                        format: 'umd',
                        minify: true,
                        name: 'Chart',
                    },
                ] : [
                    {
                        entryFileNames: 'frost-charts.esm.js',
                        format: 'es',
                        minify: false,
                    },
                    {
                        entryFileNames: 'frost-charts.esm.min.js',
                        format: 'es',
                        minify: true,
                    },
                ],
            },
            sourcemap: true,
            target: 'baseline-widely-available',
        },
    };
});
