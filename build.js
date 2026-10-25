const path = require('path');
const fs = require('fs');
const filepath = require('filepath');
const terser = require('terser');

const srcFolder = 'src';
const distFolder = 'dist';

const name = 'frost-chart';

// create dist folder if it doesn't exist
if (!fs.existsSync(distFolder)) {
    fs.mkdirSync(distFolder);
}

// load files and wrapper
let wrapper, layer, chart;
const files = [];

filepath.create(srcFolder).recurse(fullPath => {
    if (!fullPath.isFile()) {
        return;
    }

    if (path.extname(fullPath.path) === '.js') {
        const fileName = path.basename(fullPath.path, '.js');
        const data = fs.readFileSync(fullPath.path, 'utf8');

        switch (fileName) {
            case 'wrapper':
                wrapper = data;
                break;
            case 'Chart':
                chart = data;
                break;
            case 'Layer':
                layer = data;
                break;
            default:
                files.push(data);
                break;
        }
    }
});

files.unshift(chart);
files.unshift(layer);

// inject code to wrapper
const code = wrapper.replace(
    '    // {{code}}',
    files.join('\r\n\r\n')
        .replace(
            /^(?!\s*$)/mg,
            ' '.repeat(4)
        )
);

// minify
const minified = terser.minify(code, {
    ecma: 8,
    compress: {
        ecma: 8
    }
});

// write files
if (minified.error) {
    console.error(minified.error);
} else {
    fs.writeFileSync(
        path.join(distFolder, name + '.js'),
        code
    );

    fs.writeFileSync(
        path.join(distFolder, name + '.min.js'),
        minified.code
    );
}