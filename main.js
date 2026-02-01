const { Plugin, Notice, PluginSettingTab, Setting, FuzzySuggestModal, Modal } = require('obsidian');

// 默认配置
const DEFAULT_SETTINGS = {
  // 全局过滤（所有规则都要满足）
  watchFolder: '',      // 监控的文件夹（留空=整个仓库）
  keywords: '',         // 文件名关键词（留空=不过滤）
  delayTime: 2000,      // 延迟执行时间（毫秒）

  // 规则列表（按顺序匹配，只执行第一个）
  rules: [
    {
      id: 1,
      enabled: true,
      watchProperty: 'tags',
      triggerValue: '已发',
      targetFolder: '笔记/自媒体文章笔记',
      blockingValue: '待发'
    }
  ]
};

// 规范化路径（处理 Windows 路径分隔符）
function normalizePath(path) {
  if (!path) return '';
  // 将反斜杠转换为正斜杠
  return path.replace(/\\/g, '/');
}

// 检查路径是否在指定文件夹下
function isPathInFolderPath(path, folderPath) {
  const normalizedPath = normalizePath(path);
  const normalizedFolder = normalizePath(folderPath);

  if (!normalizedFolder) {
    // 如果没有设置监控文件夹，监控整个仓库（包括所有子目录）
    return true;
  }

  // 移除开头和结尾的斜杠
  const cleanPath = normalizedPath.replace(/^\/+|\/+$/g, '');
  const cleanFolder = normalizedFolder.replace(/^\/+|\/+$/g, '');

  // 检查路径是否以文件夹路径开头
  return cleanPath.startsWith(cleanFolder + '/') || cleanPath === cleanFolder;
}

// 规则编辑模态框
class RuleEditModal extends Modal {
  constructor(app, plugin, rule, onSave) {
    super(app);
    this.plugin = plugin;
    this.rule = rule;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: this.rule ? '编辑规则' : '添加规则' });

    // 规则ID（新建规则时自动生成）
    if (!this.rule) {
      this.rule = {
        id: Date.now(),
        enabled: true,
        watchProperty: 'tags',
        triggerValue: '已发',
        targetFolder: '',
        blockingValue: ''
      };
    }

    // 监控属性
    new Setting(contentEl)
      .setName('监控属性')
      .setDesc('要监控的 frontmatter 属性名（如：tags、status、form 等）')
      .addText(text => {
        text
          .setPlaceholder('tags')
          .setValue(this.rule.watchProperty)
          .onChange(value => {
            this.rule.watchProperty = value.trim();
          });
      });

    // 触发值
    new Setting(contentEl)
      .setName('触发值')
      .setDesc('当属性包含此值时，触发移动')
      .addText(text => {
        text
          .setPlaceholder('已发')
          .setValue(this.rule.triggerValue)
          .onChange(value => {
            this.rule.triggerValue = value.trim();
          });
      });

    // 目标文件夹
    new Setting(contentEl)
      .setName('目标文件夹')
      .setDesc('文件移动的目标路径')
      .addText(text => {
        text
          .setPlaceholder('归档/已发文章')
          .setValue(this.rule.targetFolder)
          .onChange(value => {
            this.rule.targetFolder = value.trim();
          });
      })
      .addButton(button => {
        button
          .setButtonText('选择文件夹')
          .onClick(() => {
            new FolderSuggestModal(this.app, (folder) => {
              this.rule.targetFolder = folder;
              this.close();
              new RuleEditModal(this.app, this.plugin, this.rule, this.onSave).open();
            }).open();
          });
      });

    // 阻止值
    new Setting(contentEl)
      .setName('阻止值')
      .setDesc('如果属性同时包含此值，则不移动（留空则不阻止）')
      .addText(text => {
        text
          .setPlaceholder('待发')
          .setValue(this.rule.blockingValue)
          .onChange(value => {
            this.rule.blockingValue = value.trim();
          });
      });

    // 启用状态
    new Setting(contentEl)
      .setName('启用此规则')
      .setDesc('是否启用此规则')
      .addToggle(toggle => {
        toggle
          .setValue(this.rule.enabled)
          .onChange(value => {
            this.rule.enabled = value;
          });
      });

    // 保存按钮
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';

    const cancelButton = buttonContainer.createEl('button', { text: '取消' });
    cancelButton.onclick = () => this.close();

    const saveButton = buttonContainer.createEl('button', { text: '保存' });
    saveButton.style.marginLeft = '10px';
    saveButton.onclick = () => {
      if (this.onSave) {
        this.onSave(this.rule);
      }
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// 文件夹选择模态框
class FolderSuggestModal extends FuzzySuggestModal {
  constructor(app, onSelect) {
    super(app);
    this.onSelect = onSelect;
  }

  getItems() {
    // 获取所有文件夹
    const folders = new Set();
    const files = this.app.vault.getMarkdownFiles();

    files.forEach(file => {
      const path = file.parent?.path || '';
      if (path && path !== '/') {
        folders.add(path);
      }
    });

    return Array.from(folders).sort();
  }

  getItemText(item) {
    return item;
  }

  onChooseItem(item, evt) {
    this.onSelect(item);
  }
}

class AutoMovePublishedArticlesPlugin extends Plugin {
  constructor(app, manifest) {
    super(app, manifest);
    this.settings = DEFAULT_SETTINGS;
  }

  async onload() {
    console.log('Auto Move File v3.0 plugin loaded');
    new Notice('Auto Move File v3.0 plugin loaded');

    // 加载样式
    this.loadStyles();

    // 加载配置
    await this.loadSettings();

    // 监听文件修改事件
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        this.onFileModified(file);
      })
    );

    // 添加命令
    this.addCommand({
      id: 'check-active-file',
      name: '检查并移动当前文章',
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          this.checkAndMoveFile(activeFile);
        } else {
          new Notice('没有活动的文件');
        }
      },
    });

    this.addCommand({
      id: 'check-all-files',
      name: '检查并移动所有文章',
      callback: () => {
        this.checkAllFiles();
      },
    });

    // 添加设置页
    this.addSettingTab(new AutoMovePublishedArticlesSettingTab(this.app, this));
  }

  loadStyles() {
    // 加载 CSS 样式
    const stylesPath = '.obsidian/plugins/auto-move-file/styles.css';
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = stylesPath;
    document.head.appendChild(styles);
  }

  async onFileModified(file) {
    console.log('=== File modified event triggered ===');
    console.log('File modified:', file.path);

    // 延迟执行
    setTimeout(() => {
      console.log('=== Delay elapsed, checking file now ===');
      const freshFile = this.app.vault.getAbstractFileByPath(file.path);
      if (freshFile) {
        this.checkAndMoveFile(freshFile);
      } else {
        console.log('  -> File no longer exists:', file.path);
      }
    }, this.settings.delayTime);
  }

  async checkAndMoveFile(file) {
    console.log('=== checkAndMoveFile called ===');
    console.log('File path:', file.path);
    console.log('File name:', file.name);

    // 只处理 markdown 文件
    if (file.extension !== 'md') {
      console.log('  -> Not a markdown file');
      return;
    }

    // 检查监控文件夹
    const inFolder = isPathInFolderPath(file.path, this.settings.watchFolder);
    console.log(`  -> In watch folder (${this.settings.watchFolder || 'root'}): ${inFolder}`);

    // 检查监控关键词
    let matchesKeywords = true;
    if (this.settings.keywords) {
      const keywords = this.settings.keywords.split(',').map(k => k.trim()).filter(k => k);
      matchesKeywords = keywords.some(keyword => file.name.includes(keyword));
      console.log(`  -> Matches keywords (${keywords}): ${matchesKeywords}`);
    } else {
      console.log('  -> No keywords set (all files match)');
    }

    // 判断是否应该监控：
    // - 如果设置了文件夹和关键词：AND 关系（两个都要满足）
    // - 如果只设置了文件夹：只检查文件夹
    // - 如果只设置了关键词：只检查关键词
    // - 如果都没设置：监控整个仓库
    const hasFolderSetting = this.settings.watchFolder && this.settings.watchFolder.trim() !== '';
    const hasKeywordsSetting = this.settings.keywords && this.settings.keywords.trim() !== '';

    let shouldMonitor = false;

    if (hasFolderSetting && hasKeywordsSetting) {
      // 两个都设置了：AND 关系
      shouldMonitor = inFolder && matchesKeywords;
      console.log('  -> Both folder and keywords set, using AND logic');
    } else if (hasFolderSetting) {
      // 只设置了文件夹
      shouldMonitor = inFolder;
      console.log('  -> Only folder set');
    } else if (hasKeywordsSetting) {
      // 只设置了关键词
      shouldMonitor = matchesKeywords;
      console.log('  -> Only keywords set');
    } else {
      // 都没设置：监控整个仓库
      shouldMonitor = true;
      console.log('  -> No settings, monitoring all files');
    }

    console.log(`  -> Should monitor: ${shouldMonitor}`);

    if (!shouldMonitor) {
      return;
    }

    console.log('  -> File passed all checks');

    // 获取文件缓存
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache || !cache.frontmatter) {
      console.log('  -> No frontmatter found');
      return;
    }

    // 遍历规则，检查是否有匹配的
    for (const rule of this.settings.rules) {
      if (!rule.enabled) {
        console.log(`  -> Rule ${rule.id} is disabled, skipping`);
        continue;
      }

      console.log(`  -> Checking rule ${rule.id}...`);

      // 获取属性值
      const propertyValue = cache.frontmatter[rule.watchProperty];
      if (!propertyValue) {
        console.log(`  -> Property '${rule.watchProperty}' not found, skipping rule ${rule.id}`);
        continue;
      }

      // 检查是否匹配
      let matchesTrigger = false;
      let hasBlocking = false;

      if (Array.isArray(propertyValue)) {
        // 数组类型：使用 includes 检查
        matchesTrigger = propertyValue.includes(rule.triggerValue);
        hasBlocking = rule.blockingValue && propertyValue.includes(rule.blockingValue);
        console.log(`  -> Property '${rule.watchProperty}' (array):`, propertyValue);
      } else if (typeof propertyValue === 'string') {
        // 字符串类型：使用完全相等检查
        matchesTrigger = propertyValue === rule.triggerValue;
        hasBlocking = rule.blockingValue && propertyValue === rule.blockingValue;
        console.log(`  -> Property '${rule.watchProperty}' (string):`, propertyValue);
      } else {
        // 其他类型
        console.log(`  -> Property '${rule.watchProperty}' is not valid type, skipping rule ${rule.id}`);
        continue;
      }

      console.log(`  -> Matches trigger (${rule.triggerValue}): ${matchesTrigger}, Has blocking (${rule.blockingValue || 'none'}): ${hasBlocking}`);

      // 匹配且不阻止 → 移动
      if (matchesTrigger && !hasBlocking) {
        console.log(`  -> Rule ${rule.id} matched! Moving to ${rule.targetFolder}`);
        await this.moveFile(file, rule.targetFolder);
        console.log('=== checkAndMoveFile completed (moved) ===\n');
        return;
      }
    }

    console.log('  -> No rule matched, no move needed');
    console.log('=== checkAndMoveFile completed (no move) ===\n');
  }

  async moveFile(file, targetDir) {
    console.log('moveFile called for:', file.path, '->', targetDir);

    // 确保目标目录存在
    const targetFolder = this.app.vault.getAbstractFileByPath(targetDir);
    if (!targetFolder) {
      console.log('Creating target directory:', targetDir);
      await this.app.vault.createFolder(targetDir);
    }

    // 目标路径
    const targetPath = `${targetDir}/${file.name}`;
    console.log('Target path:', targetPath);

    // 检查目标文件是否已存在
    const existingFile = this.app.vault.getAbstractFileByPath(targetPath);
    if (existingFile) {
      console.log(`文件 ${file.name} 已存在于目标目录`);
      new Notice(`文件 ${file.name} 已存在于目标目录`);
      return;
    }

    // 移动文件
    try {
      console.log('Renaming file...');
      await this.app.fileManager.renameFile(file, targetPath);
      console.log(`文件 ${file.name} 已移动到 ${targetDir}`);

      // 显示通知
      new Notice(`文章 "${file.name}" 已移动到 ${targetDir}`);
    } catch (error) {
      console.error('移动文件失败:', error);
      new Notice(`移动文件失败: ${error.message}`, 5000);
    }
  }

  async checkAllFiles() {
    const files = this.vault.getMarkdownFiles();
    let checkedCount = 0;
    let movedCount = 0;

    for (const file of files) {
      // 检查是否应该监控这个文件
      const inFolder = isPathInFolderPath(file.path, this.settings.watchFolder);
      let matchesKeywords = true;

      if (this.settings.keywords) {
        const keywords = this.settings.keywords.split(',').map(k => k.trim()).filter(k => k);
        matchesKeywords = keywords.some(keyword => file.name.includes(keyword));
      }

      const hasFolderSetting = this.settings.watchFolder && this.settings.watchFolder.trim() !== '';
      const hasKeywordsSetting = this.settings.keywords && this.settings.keywords.trim() !== '';

      let shouldMonitor = false;

      if (hasFolderSetting && hasKeywordsSetting) {
        // 两个都设置了：AND 关系
        shouldMonitor = inFolder && matchesKeywords;
      } else if (hasFolderSetting) {
        // 只设置了文件夹
        shouldMonitor = inFolder;
      } else if (hasKeywordsSetting) {
        // 只设置了关键词
        shouldMonitor = matchesKeywords;
      } else {
        // 都没设置：监控根目录
        shouldMonitor = !file.path.includes('/');
      }

      if (shouldMonitor) {
        checkedCount++;
        const beforePath = file.path;
        await this.checkAndMoveFile(file);
        // 检查文件是否被移动了
        if (this.app.vault.getAbstractFileByPath(beforePath) === null) {
          movedCount++;
        }
      }
    }

    new Notice(`已检查 ${checkedCount} 个文件，移动了 ${movedCount} 个文件`);
  }

  async loadSettings() {
    const savedSettings = await this.loadData();
    if (savedSettings) {
      // 检测是否是旧版配置（有 targetFolder 但没有 rules）
      if (savedSettings.targetFolder && !savedSettings.rules) {
        console.log('Migrating old settings to new format...');

        // 迁移旧配置到新格式
        const migratedSettings = {
          watchFolder: savedSettings.watchFolder || '',
          keywords: savedSettings.keywords || '',
          delayTime: savedSettings.delayTime || 2000,
          rules: [
            {
              id: 1,
              enabled: true,
              watchProperty: savedSettings.watchProperty || 'tags',
              triggerValue: savedSettings.publishedTag || '已发',
              targetFolder: savedSettings.targetFolder,
              blockingValue: savedSettings.pendingTag || '待发'
            }
          ]
        };

        this.settings = { ...DEFAULT_SETTINGS, ...migratedSettings };

        // 保存新配置
        await this.saveSettings();
        new Notice('配置已自动迁移到 v3.0 格式');
      } else {
        // 新版配置，直接加载
        this.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
      }
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    console.log('Auto Move Published Articles plugin unloaded');
  }
}

class AutoMovePublishedArticlesSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.selectedRules = new Set();
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: '自动移动文件插件设置 v3.0' });

    // ========== 全局配置区 ==========
    containerEl.createEl('h3', { text: '全局配置' });

    // 监控文件夹
    new Setting(containerEl)
      .setName('监控文件夹')
      .setDesc('监控的文件夹路径（留空则监控整个仓库，支持相对路径和绝对路径）。所有规则都要满足此条件。')
      .addText(text => {
        text
          .setPlaceholder('留空则忽略此条件')
          .setValue(this.plugin.settings.watchFolder)
          .onChange(async (value) => {
            this.plugin.settings.watchFolder = normalizePath(value.trim());
            await this.plugin.saveSettings();
          });
      })
      .addButton(button => {
        button
          .setButtonText('选择文件夹')
          .onClick(() => {
            new FolderSuggestModal(this.app, async (folder) => {
              this.plugin.settings.watchFolder = folder;
              await this.plugin.saveSettings();
            }).open();
          });
      });

    // 监控关键词
    new Setting(containerEl)
      .setName('监控关键词')
      .setDesc('文件名包含的关键词（留空则忽略，多个关键词用逗号分隔）。所有规则都要满足此条件。')
      .addText(text => {
        text
          .setPlaceholder('留空则忽略此条件')
          .setValue(this.plugin.settings.keywords)
          .onChange(async (value) => {
            this.plugin.settings.keywords = value;
            await this.plugin.saveSettings();
          });
      });

    // 延迟时间
    new Setting(containerEl)
      .setName('延迟时间（毫秒）')
      .setDesc('文件修改后延迟多久执行检查')
      .addSlider(slider => {
        slider
          .setLimits(500, 5000, 500)
          .setValue(this.plugin.settings.delayTime)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.delayTime = value;
            await this.plugin.saveSettings();
          });
      });

    // ========== 规则列表区 ==========
    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: '规则列表' });

    // 添加规则按钮
    const addButton = containerEl.createEl('button', { text: '+ 添加新规则' });
    addButton.style.marginBottom = '10px';
    addButton.style.padding = '8px 16px';
    addButton.onclick = () => {
      new RuleEditModal(this.app, this.plugin, null, async (rule) => {
        this.plugin.settings.rules.push(rule);
        await this.plugin.saveSettings();
        this.display();
      }).open();
    };

    // 规则表格
    if (this.plugin.settings.rules.length === 0) {
      const emptyText = containerEl.createDiv();
      emptyText.textContent = '暂无规则，请添加新规则';
      emptyText.style.color = 'var(--text-muted)';
      emptyText.style.padding = '20px';
      emptyText.style.textAlign = 'center';
    } else {
      const table = containerEl.createEl('table');
      table.addClass('rules-table');

      // 表头
      const thead = table.createEl('thead');
      const headerRow = thead.createEl('tr');
      ['', '#', '启用', '监控属性', '触发值', '目标文件夹', '阻止值', '操作'].forEach(text => {
        const th = headerRow.createEl('th');
        th.textContent = text;
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        th.style.borderBottom = '1px solid var(--background-modifier-border)';
      });

      // 表体
      const tbody = table.createEl('tbody');
      this.plugin.settings.rules.forEach((rule, index) => {
        const row = tbody.createEl('tr');
        row.style.borderBottom = '1px solid var(--background-modifier-border)';

        // 复选框
        const checkboxCell = row.createEl('td');
        checkboxCell.style.padding = '8px';
        const checkbox = checkboxCell.createEl('input', { type: 'checkbox' });
        checkbox.checked = this.selectedRules.has(rule.id);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            this.selectedRules.add(rule.id);
          } else {
            this.selectedRules.delete(rule.id);
          }
          this.updateSelectionStatus();
        });

        // 规则编号
        const idCell = row.createEl('td');
        idCell.textContent = index + 1;
        idCell.style.padding = '8px';

        // 启用状态
        const enabledCell = row.createEl('td');
        enabledCell.textContent = rule.enabled ? '🔴' : '⭕';
        enabledCell.style.padding = '8px';
        enabledCell.style.textAlign = 'center';

        // 监控属性
        const propCell = row.createEl('td');
        propCell.textContent = rule.watchProperty;
        propCell.style.padding = '8px';

        // 触发值
        const triggerCell = row.createEl('td');
        triggerCell.textContent = rule.triggerValue;
        triggerCell.style.padding = '8px';
        triggerCell.style.fontWeight = 'bold';
        triggerCell.style.color = 'var(--text-accent)';

        // 目标文件夹
        const targetCell = row.createEl('td');
        targetCell.textContent = rule.targetFolder;
        targetCell.style.padding = '8px';

        // 阻止值
        const blockingCell = row.createEl('td');
        blockingCell.textContent = rule.blockingValue || '-';
        blockingCell.style.padding = '8px';
        blockingCell.style.color = rule.blockingValue ? 'var(--text-warning)' : 'var(--text-muted)';

        // 操作按钮
        const actionsCell = row.createEl('td');
        actionsCell.style.padding = '8px';

        // 编辑按钮
        const editBtn = actionsCell.createEl('button', { text: '✏️' });
        editBtn.style.marginRight = '5px';
        editBtn.style.padding = '4px 8px';
        editBtn.onclick = () => {
          new RuleEditModal(this.app, this.plugin, rule, async (updatedRule) => {
            const ruleIndex = this.plugin.settings.rules.findIndex(r => r.id === rule.id);
            if (ruleIndex !== -1) {
              this.plugin.settings.rules[ruleIndex] = updatedRule;
              await this.plugin.saveSettings();
              this.display();
            }
          }).open();
        };

        // 删除按钮
        const deleteBtn = actionsCell.createEl('button', { text: '🗑️' });
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.onclick = () => {
          this.plugin.settings.rules = this.plugin.settings.rules.filter(r => r.id !== rule.id);
          this.plugin.saveSettings();
          this.display();
        };
      });
    }

    // ========== 批量操作栏 ==========
    if (this.plugin.settings.rules.length > 0) {
      containerEl.createEl('hr');
      const batchDiv = containerEl.createDiv();
      batchDiv.style.marginTop = '10px';

      this.selectionStatus = batchDiv.createDiv();
      this.selectionStatus.textContent = '已选中 0 个规则';
      this.selectionStatus.style.marginBottom = '10px';
      this.selectionStatus.style.fontWeight = 'bold';

      const buttonContainer = batchDiv.createDiv();
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '10px';

      const deleteButton = buttonContainer.createEl('button', { text: '🗑️ 删除选中' });
      deleteButton.onclick = () => this.batchDelete();

      const disableButton = buttonContainer.createEl('button', { text: '⏸️ 禁用选中' });
      disableButton.onclick = () => this.batchSetEnabled(false);

      const enableButton = buttonContainer.createEl('button', { text: '▶️ 启用选中' });
      enableButton.onclick = () => this.batchSetEnabled(true);
    }

    // ========== 测试按钮 ==========
    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: '测试功能' });

    new Setting(containerEl)
      .setName('测试当前文件')
      .setDesc('检查当前活动文件是否符合移动条件')
      .addButton(button => {
        button
          .setButtonText('测试当前文件')
          .onClick(() => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
              this.plugin.checkAndMoveFile(activeFile);
            } else {
              new Notice('没有活动的文件');
            }
          });
      });

    new Setting(containerEl)
      .setName('检查所有文件')
      .setDesc('检查所有符合条件的文件')
      .addButton(button => {
        button
          .setButtonText('检查所有')
          .onClick(() => {
            this.plugin.checkAllFiles();
          });
      });

    // ========== 作者信息 ==========
    containerEl.createEl('hr');

    const authorDiv = containerEl.createDiv();
    authorDiv.style.padding = '15px';
    authorDiv.style.marginTop = '20px';
    authorDiv.style.textAlign = 'center';
    authorDiv.style.backgroundColor = 'var(--background-secondary)';
    authorDiv.style.borderRadius = '8px';
    authorDiv.style.border = '1px solid var(--background-modifier-border)';

    const authorName = document.createElement('h4');
    authorName.textContent = '作者';
    authorName.style.margin = '0 0 5px 0';
    authorName.style.color = 'var(--text-accent)';
    authorName.style.fontSize = '1.1em';
    authorDiv.appendChild(authorName);

    const authorButton = document.createElement('button');
    authorButton.textContent = '小新空';
    authorButton.style.margin = '0';
    authorButton.style.padding = '8px 24px';
    authorButton.style.color = 'var(--text-normal)';
    authorButton.style.fontSize = '1.1em';
    authorButton.style.fontWeight = '600';
    authorButton.style.border = '2px solid var(--interactive-accent)';
    authorButton.style.borderRadius = '6px';
    authorButton.style.backgroundColor = 'var(--interactive-accent-hover)';
    authorButton.style.cursor = 'pointer';
    authorButton.style.transition = 'all 0.2s ease';
    authorButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

    authorButton.onmouseenter = () => {
      authorButton.style.transform = 'translateY(-2px)';
      authorButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    };
    authorButton.onmouseleave = () => {
      authorButton.style.transform = 'translateY(0)';
      authorButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    };

    authorButton.onclick = () => {
      navigator.clipboard.writeText('小新空').then(() => {
        new Notice('已复制「小新空」到剪贴板，请在微信中搜索');
      }).catch(() => {
        window.open('https://weixin.qq.com/', '_blank');
      });
    };

    authorDiv.appendChild(authorButton);

    const wechatHint = document.createElement('div');
    wechatHint.textContent = '微信公众号：小新空';
    wechatHint.style.marginTop = '12px';
    wechatHint.style.color = 'var(--text-muted)';
    wechatHint.style.fontSize = '0.85em';
    authorDiv.appendChild(wechatHint);

    const searchHint = document.createElement('div');
    searchHint.textContent = '点击上方按钮，在微信中搜索「小新空」';
    searchHint.style.marginTop = '4px';
    searchHint.style.color = 'var(--text-faint)';
    searchHint.style.fontSize = '0.8em';
    authorDiv.appendChild(searchHint);
  }

  updateSelectionStatus() {
    if (this.selectionStatus) {
      this.selectionStatus.textContent = `已选中 ${this.selectedRules.size} 个规则`;
    }
  }

  async batchDelete() {
    if (this.selectedRules.size === 0) {
      new Notice('请先选择要删除的规则');
      return;
    }

    this.plugin.settings.rules = this.plugin.settings.rules.filter(r => !this.selectedRules.has(r.id));
    await this.plugin.saveSettings();
    this.selectedRules.clear();
    this.display();
    new Notice(`已删除 ${this.selectedRules.size} 个规则`);
  }

  async batchSetEnabled(enabled) {
    if (this.selectedRules.size === 0) {
      new Notice('请先选择要操作的规则');
      return;
    }

    this.plugin.settings.rules.forEach(rule => {
      if (this.selectedRules.has(rule.id)) {
        rule.enabled = enabled;
      }
    });

    await this.plugin.saveSettings();
    this.display();
    new Notice(`已${enabled ? '启用' : '禁用'} ${this.selectedRules.size} 个规则`);
  }
}

module.exports = AutoMovePublishedArticlesPlugin;
