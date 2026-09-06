// 本插件没有编译步骤：main.js 即源码。
// 提供标准 build 脚本：先做语法校验，再把发布文件复制到 build/ 目录，
// 供官方构建验证（build reproduction）和发布流程使用。
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'build');

// 语法校验（只编译不执行）
new Function(fs.readFileSync(path.join(root, 'main.js'), 'utf8'));

fs.mkdirSync(out, { recursive: true });
for (const f of ['main.js', 'manifest.json', 'styles.css', 'versions.json']) {
  fs.copyFileSync(path.join(root, f), path.join(out, f));
  console.log('build/' + f);
}
console.log('Build completed (passthrough, no bundling required).');
