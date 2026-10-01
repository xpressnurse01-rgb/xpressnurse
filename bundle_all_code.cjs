const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const outputFile = path.join(rootDir, 'COMPLETE_SOURCE_CODE_EVERY_FILE.txt');

const targetExtensions = ['.ts', '.tsx', '.sql', '.css', '.html', '.json'];
const excludeDirs = ['node_modules', '.git', 'dist', '.gemini'];
const excludeFiles = ['package-lock.json'];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!excludeDirs.includes(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (targetExtensions.includes(ext) && !excludeFiles.includes(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(rootDir).sort();

console.log(`Found ${allFiles.length} files to concatenate.`);

let stream = fs.createWriteStream(outputFile, { encoding: 'utf-8' });

stream.write(`================================================================================\n`);
stream.write(`XPRESSNURSE - COMPLETE REPOSITORY SOURCE CODE (EVERY FILE & EVERY LINE)\n`);
stream.write(`GENERATED AT: ${new Date().toISOString()}\n`);
stream.write(`TOTAL SOURCE FILES: ${allFiles.length}\n`);
stream.write(`================================================================================\n\n`);

allFiles.forEach((file, index) => {
  const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  stream.write(`\n`);
  stream.write(`################################################################################\n`);
  stream.write(`### FILE ${index + 1}/${allFiles.length}: ${relPath}\n`);
  stream.write(`### TOTAL LINES: ${lines.length}\n`);
  stream.write(`################################################################################\n\n`);

  lines.forEach((line, lineIdx) => {
    stream.write(`${(lineIdx + 1).toString().padStart(5, ' ')}: ${line}\n`);
  });

  stream.write(`\n`);
});

stream.end(() => {
  console.log(`Successfully generated ${outputFile}`);
  generateMarkdown();
});

function generateMarkdown() {
  const mdFile = path.join(rootDir, 'COMPLETE_SOURCE_CODE_EVERY_FILE.md');
  const mdStream = fs.createWriteStream(mdFile, { encoding: 'utf-8' });

  mdStream.write(`# XpressNurse — Complete Source Code Repository\n\n`);
  mdStream.write(`> Generated: ${new Date().toISOString()}  \n`);
  mdStream.write(`> Total Files: ${allFiles.length}  \n\n`);

  mdStream.write(`## Table of Contents\n\n`);
  allFiles.forEach((file, index) => {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
    mdStream.write(`${index + 1}. [${relPath}](#file-${index + 1})\n`);
  });
  mdStream.write(`\n---\n\n`);

  allFiles.forEach((file, index) => {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf-8');
    const ext = path.extname(file).replace('.', '') || 'text';
    const lang = ext === 'ts' || ext === 'tsx' ? 'typescript' : ext === 'css' ? 'css' : ext === 'sql' ? 'sql' : ext === 'json' ? 'json' : ext === 'html' ? 'html' : 'text';

    mdStream.write(`\n### File ${index + 1}: \`${relPath}\`\n\n`);
    mdStream.write(`\`\`\`${lang}\n`);
    mdStream.write(content);
    mdStream.write(`\n\`\`\`\n\n---\n\n`);
  });

  mdStream.end(() => {
    console.log(`Successfully generated ${mdFile}`);
  });
}
