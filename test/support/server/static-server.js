import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const css = 'text/css; charset=utf-8';
const html = 'text/html; charset=utf-8';
const javaScript = 'text/javascript; charset=utf-8';
const resolveModule = (specifier) => new URL(import.meta.resolve(specifier));

const routes = new Map([
    ['/', { contentType: html, file: new URL('../app/index.html', import.meta.url) }],
    ['/assets/frost-charts.js', { contentType: javaScript, file: new URL('../../../dist/frost-charts.js', import.meta.url) }],
    ['/assets/frost-charts.min.js', { contentType: javaScript, file: new URL('../../../dist/frost-charts.min.js', import.meta.url) }],
    ['/assets/frost-charts.esm.js', { contentType: javaScript, file: new URL('../../../dist/frost-charts.esm.js', import.meta.url) }],
    ['/assets/frost-charts.esm.min.js', { contentType: javaScript, file: new URL('../../../dist/frost-charts.esm.min.js', import.meta.url) }],
    ['/assets/frost-ui.esm.js', { contentType: javaScript, file: resolveModule('@fr0st/ui') }],
    ['/assets/frost-core.esm.js', { contentType: javaScript, file: resolveModule('@fr0st/core') }],
    ['/assets/fquery.esm.js', { contentType: javaScript, file: resolveModule('@fr0st/query') }],
    ['/assets/frost-ui-bundle.js', { contentType: javaScript, file: resolveModule('@fr0st/ui/dist/frost-ui-bundle.js') }],
    ['/assets/frost-ui.css', { contentType: css, file: resolveModule('@fr0st/ui/dist/frost-ui.css') }],
]);

for (const file of ['index.html', 'bar.html', 'line.html', 'pie.htm']) {
    routes.set(`/demo/${file}`, {
        contentType: html,
        file: new URL(`../../../demo/${file}`, import.meta.url),
    });
}

routes.set('/dist/frost-charts.js', routes.get('/assets/frost-charts.js'));
routes.set('/node_modules/@fr0st/ui/dist/frost-ui-bundle.js', routes.get('/assets/frost-ui-bundle.js'));
routes.set('/node_modules/@fr0st/ui/dist/frost-ui.css', routes.get('/assets/frost-ui.css'));

const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const route = routes.get(url.pathname);

    if (!route) {
        response.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Not found');
        return;
    }

    try {
        const data = await readFile(route.file);

        response.writeHead(200, {
            'Content-Type': route.contentType,
        });
        response.end(data);
    } catch {
        response.writeHead(500, {
            'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Internal server error');
    }
});

server.listen(Number(process.env.PORT ?? 3017), 'localhost');
