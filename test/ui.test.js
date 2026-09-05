/*
 * Auto Move File 自动化测试
 * 运行: npm test  （或 node test/ui.test.js）
 *
 * 覆盖范围：
 *  1. 插件加载合规性（无启动通知、命令注册、不注入样式表）
 *  2. 设置页渲染（作用域 class、动态版本号、分区、规则表格、匹配方式标签）
 *  3. 规则编辑弹窗（匹配方式下拉框、监控模式切换重置、保存回调）
 *  4. 匹配逻辑（模糊/精确/正则回退/大小写/数组/阻止值）
 *  5. 端到端归档（模糊属性命中移动、阻止值拦截、精确不匹配不移动、文件名规则）
 *  6. 静态合规检查（CSS 作用域、manifest 规范、versions.json）
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { JSDOM } = require('jsdom');

// ---------- jsdom 环境 + Obsidian DOM 扩展 ----------
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;

const domProto = dom.window.HTMLElement.prototype;
domProto.createEl = function (tag, opts) {
  const el = dom.window.document.createElement(tag);
  if (opts && typeof opts === 'object') {
    if (opts.text !== undefined) el.textContent = String(opts.text);
    if (opts.cls !== undefined) el.className = String(opts.cls);
    for (const [k, v] of Object.entries(opts)) {
      if (k === 'text' || k === 'cls') continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        el.setAttribute(k, String(v));
      }
    }
  }
  this.appendChild(el);
  return el;
};
domProto.createDiv = function (opts) { return this.createEl('div', opts); };
domProto.createSpan = function (opts) { return this.createEl('span', opts); };
domProto.addClass = function (cls) { this.classList.add(cls); };
domProto.removeClass = function (cls) { this.classList.remove(cls); };
domProto.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };

// ---------- obsidian 模块 mock ----------
const notices = [];
const allSettings = [];
const modalInstances = [];

class NoticeMock {
  constructor(msg) { notices.push(String(msg)); }
}

class SettingMock {
  constructor() {
    this.controls = [];
    allSettings.push(this);
  }
  setName(v) { this.name = v; return this; }
  setDesc(v) { this.desc = v; return this; }
  addText(cb) { const c = makeText(); this.controls.push({ type: 'text', comp: c }); cb(c); return this; }
  addDropdown(cb) { const c = makeDropdown(); this.controls.push({ type: 'dropdown', comp: c }); cb(c); return this; }
  addToggle(cb) { const c = makeToggle(); this.controls.push({ type: 'toggle', comp: c }); cb(c); return this; }
  addButton(cb) { const c = makeButton(); this.controls.push({ type: 'button', comp: c }); cb(c); return this; }
  addExtraButton(cb) { return this.addButton(cb); }
}

function makeText() {
  return {
    placeholder: '', _value: '', onChangeCb: null,
    setPlaceholder(v) { this.placeholder = v; return this; },
    setValue(v) { this._value = String(v); return this; },
    getValue() { return this._value; },
    onChange(cb) { this.onChangeCb = cb; return this; },
    async set(v) { this._value = String(v); if (this.onChangeCb) await this.onChangeCb(this._value); }
  };
}
function makeDropdown() {
  return {
    options: {}, _value: undefined, onChangeCb: null,
    addOption(v, l) { this.options[v] = l; return this; },
    setValue(v) { this._value = v; return this; },
    getValue() { return this._value; },
    onChange(cb) { this.onChangeCb = cb; return this; },
    async choose(v) { this._value = v; if (this.onChangeCb) await this.onChangeCb(v); }
  };
}
function makeToggle() {
  return {
    _value: undefined, onChangeCb: null,
    setValue(v) { this._value = v; return this; },
    getValue() { return this._value; },
    onChange(cb) { this.onChangeCb = cb; return this; },
    async toggle(v) { this._value = v; if (this.onChangeCb) await this.onChangeCb(v); }
  };
}
function makeButton() {
  return {
    text: '', clickCb: null,
    setButtonText(t) { this.text = t; return this; },
    onClick(cb) { this.clickCb = cb; return this; },
    async click() { if (this.clickCb) await this.clickCb(); }
  };
}

class PluginMock {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
    this.commands = [];
    this.settingTabs = [];
  }
  addCommand(cmd) { this.commands.push(cmd); return cmd; }
  addSettingTab(tab) { this.settingTabs.push(tab); return tab; }
  registerEvent() {}
  async loadData() { return null; }
  async saveData() {}
}

class PluginSettingTabMock {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }
}

class ModalMock {
  constructor(app) {
    this.app = app;
    this.contentEl = document.createElement('div');
    modalInstances.push(this);
  }
  open() { if (this.onOpen) this.onOpen(); }
  close() { if (this.onClose) this.onClose(); }
}
class FuzzySuggestModalMock extends ModalMock {
  setPlaceholder() { return this; }
}

const obsidianMock = {
  Plugin: PluginMock,
  Notice: NoticeMock,
  PluginSettingTab: PluginSettingTabMock,
  Setting: SettingMock,
  Modal: ModalMock,
  FuzzySuggestModal: FuzzySuggestModalMock,
  Platform: { isDesktopApp: true, isMobileApp: false, isMobile: false },
  addIcon() {},
};

// 拦截 require('obsidian')
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'obsidian') return obsidianMock;
  return originalLoad.apply(this, arguments);
};

const mod = require('../main.js');

// ---------- 测试工具 ----------
const results = [];
function check(name, cond, extra) {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : '  -> ' + (extra !== undefined ? JSON.stringify(extra) : '')}`);
}
function section(title) { console.log(`\n===== ${title} =====`); }
function findSetting(name, which = 'last') {
  const hits = allSettings.filter(s => s.name === name);
  if (!hits.length) return null;
  return which === 'last' ? hits[hits.length - 1] : hits[0];
}
function resetTracking() { allSettings.length = 0; notices.length = 0; }

// ---------- app mock ----------
function makeApp(state) {
  return {
    workspace: { getActiveFile: () => state.activeFile || null, on: () => () => {} },
    vault: {
      on: () => () => {},
      getRoot: () => ({ children: [] }),
      getMarkdownFiles: () => [],
      getAbstractFileByPath: () => null,
      createFolder: async (p) => { state.createdFolders.push(p); },
    },
    metadataCache: { getFileCache: () => state.cache },
    fileManager: { renameFile: async (f, p) => { state.renamed.push([f.path, p]); } },
  };
}

const mockManifest = { id: 'auto-move-file', version: '9.9.9', name: 'Auto Move File' };

// ============================================================
(async () => {
  // ---------- 1. 插件加载合规性 ----------
  section('插件加载合规性');
  const state1 = { renamed: [], createdFolders: [], cache: null };
  const app1 = makeApp(state1);
  const plugin = new mod(app1, mockManifest);
  await plugin.onload();

  check('onload 不弹出启动 Notice（官方审核要求）', notices.length === 0, notices);
  check('onload 注册 2 个命令', plugin.commands.length === 2, plugin.commands.length);
  check('onload 注册设置页', plugin.settingTabs.length === 1);
  check('onload 不再手动注入样式表（Obsidian 会自动加载 styles.css）',
    document.head.querySelectorAll('link').length === 0);

  // ---------- 2. 设置页渲染 ----------
  section('设置页渲染');
  resetTracking();
  const tab = plugin.settingTabs[0];
  tab.display();

  check('设置页根节点有 auto-move-file-settings class（样式作用域）',
    tab.containerEl.classList.contains('auto-move-file-settings'));
  check('标题版本号来自 manifest（非硬编码，mock 版本 9.9.9）',
    tab.containerEl.querySelector('h2').textContent.includes('9.9.9'),
    tab.containerEl.querySelector('h2').textContent);
  const h3s = [...tab.containerEl.querySelectorAll('h3')].map(h => h.textContent);
  check('包含分区：全局配置/规则列表/手动操作',
    ['全局配置', '规则列表', '手动操作'].every(t => h3s.includes(t)), h3s.join(','));

  const settingNames = allSettings.map(s => s.name);
  for (const n of ['监控文件夹', '监控关键词', '延迟时间', '扫描文件夹', '执行优先级模式', '实时监控归档', '测试当前文件', '检查所有文件']) {
    check(`设置项存在：${n}`, settingNames.includes(n));
  }

  const ths = [...tab.containerEl.querySelectorAll('thead th')].map(t => t.textContent);
  check('规则表表头 10 列', ths.length === 10, ths.join('|'));
  check('规则表应用 rules-table class', !!tab.containerEl.querySelector('table.rules-table'));
  const rows = tab.containerEl.querySelectorAll('tbody tr');
  check('默认规则渲染 1 行', rows.length === 1, rows.length);
  const triggerText = rows[0] ? rows[0].children[4].textContent : '';
  check('触发条件列显示匹配方式标签', /（🎯 精确）|（🔍 模糊）/.test(triggerText), triggerText);

  // 启用状态图标：启用=🟢，禁用=⭕
  plugin.settings.rules.push({ id: 99, enabled: false, watchMode: 'property', watchProperty: 'tags', triggerValue: 'x', targetFolder: 't', blockingValue: '', copyMode: false, matchMode: 'exact', archiveFolder: false, filenamePattern: '', sourceFolder: '' });
  tab.display();
  const rowsAfter = tab.containerEl.querySelectorAll('tbody tr');
  check('启用状态图标：启用显示🟢（非红色）', rowsAfter[0].children[2].textContent === '🟢', rowsAfter[0].children[2].textContent);
  check('启用状态图标：禁用显示⭕', rowsAfter[1].children[2].textContent === '⭕', rowsAfter[1].children[2].textContent);
  plugin.settings.rules.pop();
  tab.display();

  const pageButtons = [...tab.containerEl.querySelectorAll('button')].map(b => b.textContent);
  check('存在“添加新规则”按钮', pageButtons.some(t => t.includes('添加新规则')));
  const manualBtns = findSetting('测试当前文件').controls[0].comp.text;
  const checkAllBtn = findSetting('检查所有文件').controls[0].comp.text;
  check('存在手动操作按钮（测试当前文件/检查所有）',
    manualBtns === '测试当前文件' && checkAllBtn === '检查所有',
    manualBtns + '/' + checkAllBtn);

  // 触发事件处理器，确保 onChange 不抛错
  const watchFolderSetting = findSetting('监控文件夹');
  await watchFolderSetting.controls[0].comp.set('测试/文件夹');
  check('监控文件夹 onChange 可正常保存', plugin.settings.watchFolder === '测试/文件夹', plugin.settings.watchFolder);

  // ---------- 3. 规则编辑弹窗 ----------
  section('规则编辑弹窗');
  resetTracking();
  modalInstances.length = 0;
  const legacyRule = { id: 1, enabled: true, watchMode: 'filename', filenamePattern: '已发' }; // 旧规则，无 matchMode
  let saved = null;
  const modal = new mod.RuleEditModal(app1, plugin, legacyRule, r => { saved = r; });
  modal.open();

  check('弹窗根节点有 auto-move-file-modal class（样式作用域）',
    modal.contentEl.classList.contains('auto-move-file-modal'));
  check('弹窗标题为“编辑规则”', modal.contentEl.querySelector('h2').textContent === '编辑规则');

  const mmSetting = findSetting('匹配方式');
  check('弹窗包含“匹配方式”设置项', !!mmSetting);
  const mmDropdown = mmSetting && mmSetting.controls.find(c => c.type === 'dropdown').comp;
  check('匹配方式有 精确/模糊 两个选项',
    mmDropdown && Object.keys(mmDropdown.options).length === 2 &&
    Object.keys(mmDropdown.options).includes('exact') && Object.keys(mmDropdown.options).includes('fuzzy'),
    mmDropdown && JSON.stringify(mmDropdown.options));
  check('旧文件名规则默认模糊匹配', mmDropdown._value === 'fuzzy', mmDropdown._value);

  // 切换监控模式 → 弹窗重建，匹配方式重置为该模式默认值
  const wmSetting = findSetting('监控模式');
  await wmSetting.controls[0].comp.choose('property');
  check('切换为属性监控后 matchMode 重置为 exact', legacyRule.matchMode === 'exact', legacyRule.matchMode);
  const mmSetting2 = findSetting('匹配方式');
  check('重建的弹窗显示重置后的匹配方式', mmSetting2.controls.find(c => c.type === 'dropdown').comp._value === 'exact');

  await mmSetting2.controls.find(c => c.type === 'dropdown').comp.choose('fuzzy');
  check('下拉框选择模糊匹配生效', legacyRule.matchMode === 'fuzzy');

  const newestModal = modalInstances[modalInstances.length - 1];
  const saveBtn = [...newestModal.contentEl.querySelectorAll('button')].find(b => b.textContent === '保存');
  check('弹窗有保存按钮', !!saveBtn);
  saveBtn.onclick();
  check('点击保存回调携带规则数据（含 matchMode）',
    saved && saved.matchMode === 'fuzzy' && saved.watchMode === 'property', saved && JSON.stringify(saved));

  // ---------- 4. 匹配逻辑 ----------
  section('匹配逻辑（模糊=包含+正则回退，精确=全等）');
  const { fuzzyMatch, getMatchMode } = mod;
  check('模糊: 填“插件”命中 我的插件使用心得.md', fuzzyMatch('我的插件使用心得.md', '插件') === true);
  check('模糊: 填“插件”命中 obsidian插件合集.md', fuzzyMatch('obsidian插件合集.md', '插件') === true);
  check('模糊: 填“插件”不命中 软件下载.md', fuzzyMatch('软件下载.md', '插件') === false);
  check('模糊: 正则 ^插件 命中 插件笔记.md', fuzzyMatch('插件笔记.md', '^插件') === true);
  check('模糊: 正则 ^插件 不命中 我的插件.md', fuzzyMatch('我的插件.md', '^插件') === false);
  check('模糊: 正则 周报|月报 命中 2026月报.md', fuzzyMatch('2026月报.md', '周报|月报') === true);
  check('模糊: 非法正则 C++ 自动退回包含匹配', fuzzyMatch('C++教程.md', 'C++') === true);
  check('模糊: 非法正则 C++ 不误伤 Java教程.md', fuzzyMatch('Java教程.md', 'C++') === false);
  check('模糊: 不区分大小写 done 命中 DONE.md', fuzzyMatch('DONE.md', 'done') === true);
  check('兼容: 旧属性规则(无 matchMode)默认精确', getMatchMode({ watchMode: 'property' }) === 'exact');
  check('兼容: 旧文件名规则(无 matchMode)默认模糊', getMatchMode({ watchMode: 'filename' }) === 'fuzzy');
  check('路径: isPathInFolderPath 基本判断',
    mod.isPathInFolderPath('a/b/c.md', 'a/b') === true && mod.isPathInFolderPath('a/b/c.md', 'x') === false);

  // ---------- 5. 端到端归档 ----------
  section('端到端归档（checkAndMoveFile）');
  const state2 = { renamed: [], createdFolders: [], cache: null };
  const app2 = makeApp(state2);
  const plugin2 = new mod(app2, mockManifest);
  await plugin2.onload();

  const baseSettings = {
    watchFolder: '', keywords: '', delayTime: 2000, delayTimeUnit: 'ms',
    scanFolder: '', priorityMode: 'rule', realTimeMonitoring: true,
  };
  const mdFile = { path: 'notes/我的文章.md', name: '我的文章.md', extension: 'md', basename: '我的文章' };

  // 用例1：模糊匹配属性 → 移动
  plugin2.settings = { ...baseSettings, rules: [{ id: 1, enabled: true, watchMode: 'property', watchProperty: 'status', triggerValue: '已发', blockingValue: '', targetFolder: '归档', matchMode: 'fuzzy', copyMode: false, archiveFolder: false }] };
  state2.cache = { frontmatter: { status: '已发布' } };
  await plugin2.checkAndMoveFile(mdFile);
  check('模糊属性 status=已发布 含“已发” → 移动到 归档',
    state2.renamed.length === 1 && state2.renamed[0][1] === '归档/我的文章.md', state2.renamed);

  // 用例2：阻止值模糊命中 → 不移动
  state2.renamed.length = 0; notices.length = 0;
  plugin2.settings.rules[0].blockingValue = '待发';
  state2.cache = { frontmatter: { status: '已发布，待发布' } };
  await plugin2.checkAndMoveFile(mdFile);
  check('阻止值“待发”模糊命中 → 不移动', state2.renamed.length === 0, state2.renamed);

  // 用例3：精确匹配不等于 → 不移动
  state2.renamed.length = 0; notices.length = 0;
  plugin2.settings.rules[0].matchMode = 'exact';
  plugin2.settings.rules[0].blockingValue = '';
  state2.cache = { frontmatter: { status: '已发布' } };
  await plugin2.checkAndMoveFile(mdFile);
  check('精确匹配 status=已发布 ≠ 已发 → 不移动', state2.renamed.length === 0, state2.renamed);

  // 用例4：精确匹配相等 → 移动
  state2.renamed.length = 0; notices.length = 0;
  state2.cache = { frontmatter: { status: '已发' } };
  await plugin2.checkAndMoveFile(mdFile);
  check('精确匹配 status=已发 = 已发 → 移动', state2.renamed.length === 1, state2.renamed);

  // 用例5：文件名模糊规则，仅在重命名事件触发
  state2.renamed.length = 0; notices.length = 0;
  plugin2.settings.rules = [{ id: 2, enabled: true, watchMode: 'filename', filenamePattern: '插件', targetFolder: '插件归档', matchMode: 'fuzzy', copyMode: false, archiveFolder: false }];
  const pluginFile = { path: 'notes/obsidian插件合集.md', name: 'obsidian插件合集.md', extension: 'md', basename: 'obsidian插件合集' };
  await plugin2.checkAndMoveFile(pluginFile, false);
  check('文件名规则在修改事件(非重命名)不触发', state2.renamed.length === 0, state2.renamed);
  await plugin2.checkAndMoveFile(pluginFile, true);
  check('文件名模糊规则（含“插件”）在重命名事件 → 移动到 插件归档',
    state2.renamed.length === 1 && state2.renamed[0][1] === '插件归档/obsidian插件合集.md', state2.renamed);

  // 用例6：tags 数组模糊命中
  state2.renamed.length = 0; notices.length = 0;
  plugin2.settings.rules = [{ id: 3, enabled: true, watchMode: 'property', watchProperty: 'tags', triggerValue: '已发', blockingValue: '', targetFolder: '归档2', matchMode: 'fuzzy', copyMode: false, archiveFolder: false }];
  state2.cache = { frontmatter: { tags: ['文章/已发/小红书'] } };
  await plugin2.checkAndMoveFile(mdFile);
  check('tags 数组项包含“已发” → 移动到 归档2',
    state2.renamed.length === 1 && state2.renamed[0][1] === '归档2/我的文章.md', state2.renamed);

  // ---------- 6. 静态合规检查 ----------
  section('静态合规检查（面向官方审核）');
  const root = path.join(__dirname, '..');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const versions = JSON.parse(fs.readFileSync(path.join(root, 'versions.json'), 'utf8'));
  const mainSrc = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

  check('styles.css 无全局 hr 选择器（不污染整个 Obsidian）', !/(^|\n)\s*hr\s*\{/.test(css));
  check('styles.css 无全局 .modal button 选择器', !/(^|\n)\s*\.modal\s+button\s*\{/.test(css));
  check('main.js 无启动 Notice', !/new Notice\([^)]*loaded/.test(mainSrc));
  check('main.js 无手动样式注入 loadStyles', !mainSrc.includes('loadStyles'));
  check('main.js 无裸露 console.log（已收敛到 DEBUG 开关）', !/console\.log\(/.test(mainSrc));
  check('main.js electron 调用有 Platform.isDesktopApp 保护',
    mainSrc.includes('Platform.isDesktopApp'));
  check('manifest.id 合规（非空、不含 obsidian、无空格）',
    /^[a-z0-9-]+$/.test(manifest.id) && !manifest.id.includes('obsidian'), manifest.id);
  check('manifest.version 符合 x.y.z', /^\d+\.\d+\.\d+$/.test(manifest.version), manifest.version);
  check('manifest.description ≤250 字符且以句号结尾',
    manifest.description.length <= 250 && /\.$/.test(manifest.description), manifest.description.length);
  check('manifest.author 与 authorUrl 存在', !!manifest.author && !!manifest.authorUrl);
  check('versions.json 包含当前版本映射', !!versions[manifest.version], JSON.stringify(versions));
  check('仓库包含 LICENSE 与 README.md',
    fs.existsSync(path.join(root, 'LICENSE')) && fs.existsSync(path.join(root, 'README.md')));

  // ---------- 汇总 ----------
  const failed = results.filter(r => !r.pass);
  console.log(`\n========== 结果: ${results.length - failed.length}/${results.length} 通过 ==========`);
  if (failed.length) {
    console.log('失败用例:');
    failed.forEach(f => console.log(`  ❌ ${f.name}`));
    process.exit(1);
  }
})().catch(e => { console.error('测试执行出错:', e); process.exit(1); });
