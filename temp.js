const fs = require('fs');
const targetFiles = [
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-wildfire/src/index.ts',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-satellite/src/index.ts',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-military-aviation/src/index.ts',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-maritime/src/index.ts',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-iranwarlive/src/index.ts',
    'c:/dev/worldwideview-plugins/packages/wwv-plugin-aviation/src/index.ts'
];
targetFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/let engineBase = ['`"]http:\/\/localhost:5001['`"];/g, 'let engineBase = "https://dataengine.worldwideview.dev";');
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
});
