const { Plugin, Notice, PluginSettingTab, Setting, FuzzySuggestModal, Modal } = require('obsidian');

// 默认配置
const DEFAULT_SETTINGS = {
  // 全局过滤（所有规则都要满足）
  watchFolder: '',      // 监控的文件夹（留空=整个仓库）
  keywords: '',         // 文件名关键词（留空=不过滤）
  delayTime: 2000,      // 延迟执行时间（毫秒）
  delayTimeUnit: 'ms',  // 延迟时间单位：ms, s, min
  scanFolder: '',       // 手动扫描的文件夹（留空=整个仓库）
  priorityMode: 'rule', // 优先级模式：'rule'=按规则顺序, 'property'=按属性值顺序
  realTimeMonitoring: true, // 实时监控归档：true=开启, false=关闭

  // 规则列表（按顺序匹配，只执行第一个）
  rules: [
    {
      id: 1,
      enabled: true,
      watchProperty: 'tags',
      triggerValue: '已发',
      targetFolder: '笔记/自媒体文章笔记',
      blockingValue: '待发',
      copyMode: false,
      watchMode: 'property',
      archiveFolder: false,
      filenamePattern: '',
      sourceFolder: ''
    }
  ]
};

// 规范化路径（处理 Windows 路径分隔符）
function normalizePath(path) {
  if (!path) return '';
  return path.replace(/\\/g, '/');
}

// 检查路径是否在指定文件夹下
function isPathInFolderPath(path, folderPath) {
  const normalizedPath = normalizePath(path);
  const normalizedFolder = normalizePath(folderPath);

  if (!normalizedFolder) {
    return true;
  }

  const cleanPath = normalizedPath.replace(/^\/+|\/+$/g, '');
  const cleanFolder = normalizedFolder.replace(/^\/+|\/+$/g, '');

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

    if (!this.rule) {
      this.rule = {
        id: Date.now(),
        enabled: true,
        watchProperty: 'tags',
        triggerValue: '已发',
        targetFolder: '',
        blockingValue: '',
        copyMode: false,
        watchMode: 'property',
        archiveFolder: false,
        filenamePattern: '',
        sourceFolder: ''
      };
    }

    // 监控模式
    new Setting(contentEl)
      .setName('监控模式')
      .setDesc('选择监控模式')
      .addDropdown(dropdown => {
        dropdown
          .addOption('property', '监控属性值')
          .addOption('filename', '监控文件名')
          .setValue(this.rule.watchMode || 'property')
          .onChange(value => {
            this.rule.watchMode = value;
            this.close();
            new RuleEditModal(this.app, this.plugin, this.rule, this.onSave).open();
          });
      });

    // 根据监控模式显示不同的配置项
    if (this.rule.watchMode === 'property') {
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

      new Setting(contentEl)
        .setName('触发值')
        .setDesc('当属性包含此值时，触发归档')
        .addText(text => {
          text
            .setPlaceholder('已发')
            .setValue(this.rule.triggerValue)
            .onChange(value => {
              this.rule.triggerValue = value.trim();
            });
        });

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
    } else {
      new Setting(contentEl)
        .setName('文件名包含字符')
        .setDesc('输入文件名必须包含的字符串（不区分大小写）')
        .addText(text => {
          text
            .setPlaceholder('例如：已发、完成、done等')
            .setValue(this.rule.filenamePattern || '')
            .onChange(value => {
              this.rule.filenamePattern = value.trim();
            });
        });
    }

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

    // 文件夹归档模式
    new Setting(contentEl)
      .setName('文件夹归档模式')
      .setDesc('勾选时归档指定的整个文件夹，不勾选时只归档单个文件')
      .addToggle(toggle => {
        toggle
          .setValue(this.rule.archiveFolder || false)
          .onChange(value => {
            this.rule.archiveFolder = value;
            this.close();
            new RuleEditModal(this.app, this.plugin, this.rule, this.onSave).open();
          });
      });

    // 源文件夹选择（仅在文件夹归档模式下显示）
    if (this.rule.archiveFolder) {
      new Setting(contentEl)
        .setName('源文件夹')
        .setDesc('选择要归档的源文件夹路径')
        .addText(text => {
          text
            .setPlaceholder('选择要归档的源文件夹')
            .setValue(this.rule.sourceFolder || '')
            .onChange(value => {
              this.rule.sourceFolder = value.trim();
            });
        })
        .addButton(button => {
          button
            .setButtonText('选择文件夹')
            .onClick(() => {
              new FolderSuggestModal(this.app, (folder) => {
                this.rule.sourceFolder = folder;
                this.close();
                new RuleEditModal(this.app, this.plugin, this.rule, this.onSave).open();
              }).open();
            });
        });
    }

    // 复制模式（只在文件模式下可用）
    if (!this.rule.archiveFolder) {
      new Setting(contentEl)
        .setName('复制模式')
        .setDesc('勾选时复制文件到目标文件夹（保留原文件），不勾选时移动文件到目标文件夹')
        .addToggle(toggle => {
          toggle
            .setValue(this.rule.copyMode || false)
            .onChange(value => {
              this.rule.copyMode = value;
            });
        });
    }

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
    // 获取所有文件夹（包括空文件夹）
    const folders = [];
    
    // 递归函数来收集所有文件夹
    const collectFolders = (item) => {
      if (item.children && Array.isArray(item.children)) {
        if (item.path !== '/') {
          folders.push(item.path);
        }
        item.children.forEach(child => {
          collectFolders(child);
        });
      }
    };
    
    // 从根目录开始遍历
    const root = this.app.vault.getRoot();
    if (root && root.children) {
      root.children.forEach(child => {
        collectFolders(child);
      });
    }

    return folders.sort();
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
    console.log('Auto Move File v3.1.0 plugin loaded');
    new Notice('Auto Move File v3.1.0 plugin loaded');

    this.loadStyles();
    await this.loadSettings();

    // 监听文件修改事件
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (this.settings.realTimeMonitoring !== false) {
          this.onFileModified(file);
        }
      })
    );

    // 监听文件重命名事件
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        if (this.settings.realTimeMonitoring !== false) {
          this.onFileRenamed(file, oldPath);
        }
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

    this.addSettingTab(new AutoMovePublishedArticlesSettingTab(this.app, this));
  }

  loadStyles() {
    const stylesPath = '.obsidian/plugins/auto-move-file/styles.css';
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = stylesPath;
    document.head.appendChild(styles);
  }

  // 获取延迟时间（转换为毫秒）
  getDelayTimeInMs() {
    const value = this.settings.delayTime || 2000;
    const unit = this.settings.delayTimeUnit || 'ms';
    switch (unit) {
      case 's': return value * 1000;
      case 'min': return value * 60 * 1000;
      default: return value;
    }
  }

  async onFileModified(file) {
    console.log('=== File modified event triggered ===');
    console.log('File modified:', file.path);

    const hasFilenameRules = this.settings.rules && this.settings.rules.some(rule => 
      rule.enabled && rule.watchMode === 'filename'
    );
    
    if (hasFilenameRules) {
      console.log('  -> Has filename monitoring rules, skipping modify event');
      return;
    }

    const delayMs = this.getDelayTimeInMs();
    setTimeout(() => {
      console.log('=== Delay elapsed, checking file now ===');
      const freshFile = this.app.vault.getAbstractFileByPath(file.path);
      if (freshFile) {
        this.checkAndMoveFile(freshFile);
      } else {
        console.log('  -> File no longer exists:', file.path);
      }
    }, delayMs);
  }

  async onFileRenamed(file, oldPath) {
    console.log('=== File renamed event triggered ===');
    console.log('File renamed:', oldPath, '->', file.path);

    const delayMs = this.getDelayTimeInMs();
    setTimeout(() => {
      console.log('=== Delay elapsed, checking renamed file now ===');
      const freshFile = this.app.vault.getAbstractFileByPath(file.path);
      if (freshFile) {
        this.checkAndMoveFile(freshFile, true);
      } else {
        console.log('  -> File no longer exists:', file.path);
      }
    }, delayMs);
  }

  async checkAndMoveFile(file, isRenamed = false) {
    console.log('=== checkAndMoveFile called ===');
    console.log('File path:', file.path);
    console.log('File name:', file.name);

    if (file.extension !== 'md') {
      console.log('  -> Not a markdown file');
      return;
    }

    const inFolder = isPathInFolderPath(file.path, this.settings.watchFolder);
    console.log(`  -> In watch folder: ${inFolder}`);

    let matchesKeywords = true;
    if (this.settings.keywords) {
      const keywords = this.settings.keywords.split(',').map(k => k.trim()).filter(k => k);
      matchesKeywords = keywords.some(keyword => file.name.includes(keyword));
      console.log(`  -> Matches keywords: ${matchesKeywords}`);
    }

    const hasFolderSetting = this.settings.watchFolder && this.settings.watchFolder.trim() !== '';
    const hasKeywordsSetting = this.settings.keywords && this.settings.keywords.trim() !== '';

    let shouldMonitor = false;

    if (hasFolderSetting && hasKeywordsSetting) {
      shouldMonitor = inFolder && matchesKeywords;
    } else if (hasFolderSetting) {
      shouldMonitor = inFolder;
    } else if (hasKeywordsSetting) {
      shouldMonitor = matchesKeywords;
    } else {
      shouldMonitor = true;
    }

    console.log(`  -> Should monitor: ${shouldMonitor}`);

    if (!shouldMonitor) {
      return;
    }

    if (!this.settings.rules || this.settings.rules.length === 0) {
      console.log('  -> No rules defined, skipping');
      return;
    }

    let enabledRules = this.settings.rules.filter(rule => rule.enabled);
    
    if (enabledRules.length === 0) {
      console.log('  -> No enabled rules, skipping');
      return;
    }

    // 根据优先级模式对规则进行排序
    const priorityMode = this.settings.priorityMode || 'rule';
    console.log(`  -> Priority mode: ${priorityMode}`);

    if (priorityMode === 'property') {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache && cache.frontmatter) {
        const propertyOrder = Object.keys(cache.frontmatter);
        console.log(`  -> Property order:`, propertyOrder);
        
        enabledRules = enabledRules.sort((a, b) => {
          if (a.watchMode === 'filename' && b.watchMode !== 'filename') return 1;
          if (b.watchMode === 'filename' && a.watchMode !== 'filename') return -1;
          
          const indexA = propertyOrder.indexOf(a.watchProperty);
          const indexB = propertyOrder.indexOf(b.watchProperty);
          
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          
          return indexA - indexB;
        });
      }
    }

    for (const rule of enabledRules) {
      console.log(`  -> Checking rule ${rule.id}...`);

      let matchesTrigger = false;
      let hasBlocking = false;

      if (rule.watchMode === 'filename') {
        if (!isRenamed) {
          console.log(`  -> Filename monitoring, skipping`);
          continue;
        }
        
        const filename = file.name;
        const pattern = rule.filenamePattern;
        
        if (!pattern) {
          continue;
        }

        matchesTrigger = filename.toLowerCase().includes(pattern.toLowerCase());
        hasBlocking = false;
      } else {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache || !cache.frontmatter) {
          continue;
        }

        const propertyValue = cache.frontmatter[rule.watchProperty];
        if (!propertyValue) {
          continue;
        }

        if (Array.isArray(propertyValue)) {
          matchesTrigger = propertyValue.includes(rule.triggerValue);
          hasBlocking = rule.blockingValue && propertyValue.includes(rule.blockingValue);
        } else if (typeof propertyValue === 'string') {
          matchesTrigger = propertyValue === rule.triggerValue;
          hasBlocking = rule.blockingValue && propertyValue === rule.blockingValue;
        } else {
          continue;
        }
      }

      if (matchesTrigger && !hasBlocking) {
        if (rule.archiveFolder) {
          await this.archiveFolder(file, rule.targetFolder, rule.sourceFolder);
        } else if (rule.copyMode) {
          await this.copyFile(file, rule.targetFolder);
        } else {
          await this.moveFile(file, rule.targetFolder);
        }
        return;
      }
    }

    console.log('  -> No rule matched');
  }

  async archiveFolder(file, targetDir, sourceFolderPath) {
    console.log('archiveFolder called:', file.path, '->', targetDir);

    if (!sourceFolderPath || sourceFolderPath.trim() === '') {
      const fileParent = file.parent;
      if (!fileParent) {
        new Notice('文件在根目录中，无法归档文件夹');
        return;
      }
      sourceFolderPath = fileParent.path;
    }

    const sourceFolder = this.app.vault.getAbstractFileByPath(sourceFolderPath);
    if (!sourceFolder || sourceFolder.children === undefined) {
      new Notice(`源文件夹不存在: ${sourceFolderPath}`);
      return;
    }

    const sourceFolderName = sourceFolder.name;
    const targetPath = `${targetDir}/${sourceFolderName}`;

    const existingFolder = this.app.vault.getAbstractFileByPath(targetPath);
    if (existingFolder) {
      new Notice(`文件夹 ${sourceFolderName} 已存在`);
      return;
    }

    const targetFolder = this.app.vault.getAbstractFileByPath(targetDir);
    if (!targetFolder) {
      await this.app.vault.createFolder(targetDir);
    }

    try {
      await this.app.fileManager.renameFile(sourceFolder, targetPath);
      new Notice(`文件夹 "${sourceFolderName}" 已归档`);
    } catch (error) {
      new Notice(`归档失败: ${error.message}`, 5000);
    }
  }

  async copyFile(file, targetDir) {
    const targetFolder = this.app.vault.getAbstractFileByPath(targetDir);
    if (!targetFolder) {
      await this.app.vault.createFolder(targetDir);
    }

    const targetPath = `${targetDir}/${file.name}`;

    const existingFile = this.app.vault.getAbstractFileByPath(targetPath);
    if (existingFile) {
      new Notice(`文件 ${file.name} 已存在`);
      return;
    }

    try {
      const content = await this.app.vault.read(file);
      await this.app.vault.create(targetPath, content);
      new Notice(`文章 "${file.name}" 已复制`);
    } catch (error) {
      new Notice(`复制失败: ${error.message}`, 5000);
    }
  }

  async moveFile(file, targetDir) {
    const targetFolder = this.app.vault.getAbstractFileByPath(targetDir);
    if (!targetFolder) {
      await this.app.vault.createFolder(targetDir);
    }

    const targetPath = `${targetDir}/${file.name}`;

    const existingFile = this.app.vault.getAbstractFileByPath(targetPath);
    if (existingFile) {
      new Notice(`文件 ${file.name} 已存在`);
      return;
    }

    try {
      await this.app.fileManager.renameFile(file, targetPath);
      new Notice(`文章 "${file.name}" 已移动`);
    } catch (error) {
      new Notice(`移动失败: ${error.message}`, 5000);
    }
  }

  async checkAllFiles() {
    const files = this.app.vault.getMarkdownFiles();
    let checkedCount = 0;
    let movedCount = 0;

    const scanFolder = this.settings.scanFolder || '';
    
    for (const file of files) {
      if (scanFolder && !isPathInFolderPath(file.path, scanFolder)) {
        continue;
      }

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
        shouldMonitor = inFolder && matchesKeywords;
      } else if (hasFolderSetting) {
        shouldMonitor = inFolder;
      } else if (hasKeywordsSetting) {
        shouldMonitor = matchesKeywords;
      } else {
        shouldMonitor = true;
      }

      if (shouldMonitor) {
        checkedCount++;
        const beforePath = file.path;
        await this.checkAndMoveFile(file);
        if (this.app.vault.getAbstractFileByPath(beforePath) === null) {
          movedCount++;
        }
      }
    }

    const scanInfo = scanFolder ? `（扫描: ${scanFolder}）` : '';
    new Notice(`已检查 ${checkedCount} 个文件，移动了 ${movedCount} 个文件${scanInfo}`);
  }

  async loadSettings() {
    const savedSettings = await this.loadData();
    if (savedSettings) {
      this.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    console.log('Auto Move File plugin unloaded');
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

    containerEl.createEl('h2', { text: '自动移动文件插件设置 v3.1.0' });

    // 全局配置
    containerEl.createEl('h3', { text: '全局配置' });

    // 监控文件夹
    new Setting(containerEl)
      .setName('监控文件夹')
      .setDesc('监控的文件夹路径（留空则监控整个仓库）')
      .addText(text => {
        text
          .setPlaceholder('留空则忽略')
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
      .setDesc('文件名包含的关键词（多个用逗号分隔）')
      .addText(text => {
        text
          .setPlaceholder('留空则忽略')
          .setValue(this.plugin.settings.keywords)
          .onChange(async (value) => {
            this.plugin.settings.keywords = value;
            await this.plugin.saveSettings();
          });
      });

    // 延迟时间（数字输入 + 单位选择）
    const delayTimeSetting = new Setting(containerEl)
      .setName('延迟时间')
      .setDesc('文件修改后延迟多久执行检查');
    
    delayTimeSetting.addText(text => {
      text
        .setPlaceholder('2000')
        .setValue(String(this.plugin.settings.delayTime))
        .onChange(async (value) => {
          const numValue = parseInt(value, 10);
          if (!isNaN(numValue) && numValue > 0) {
            this.plugin.settings.delayTime = numValue;
            await this.plugin.saveSettings();
          }
        });
    });
    
    delayTimeSetting.addDropdown(dropdown => {
      dropdown
        .addOption('ms', '毫秒 (ms)')
        .addOption('s', '秒 (s)')
        .addOption('min', '分钟 (min)')
        .setValue(this.plugin.settings.delayTimeUnit || 'ms')
        .onChange(async (newUnit) => {
          const oldUnit = this.plugin.settings.delayTimeUnit || 'ms';
          const currentValue = this.plugin.settings.delayTime;
          
          let valueInMs = currentValue;
          if (oldUnit === 's') {
            valueInMs = currentValue * 1000;
          } else if (oldUnit === 'min') {
            valueInMs = currentValue * 60 * 1000;
          }
          
          if (newUnit === 'ms') {
            this.plugin.settings.delayTime = valueInMs;
          } else if (newUnit === 's') {
            this.plugin.settings.delayTime = Math.max(1, Math.round(valueInMs / 1000));
          } else if (newUnit === 'min') {
            this.plugin.settings.delayTime = Math.max(1, Math.round(valueInMs / 60 / 1000));
          }
          
          this.plugin.settings.delayTimeUnit = newUnit;
          await this.plugin.saveSettings();
          this.display();
        });
    });

    // 扫描文件夹
    new Setting(containerEl)
      .setName('扫描文件夹')
      .setDesc('手动触发"检查所有文件"时扫描的文件夹（留空则扫描整个仓库）')
      .addText(text => {
        text
          .setPlaceholder('留空则扫描整个仓库')
          .setValue(this.plugin.settings.scanFolder)
          .onChange(async (value) => {
            this.plugin.settings.scanFolder = normalizePath(value.trim());
            await this.plugin.saveSettings();
          });
      })
      .addButton(button => {
        button
          .setButtonText('选择文件夹')
          .onClick(() => {
            new FolderSuggestModal(this.app, async (folder) => {
              this.plugin.settings.scanFolder = folder;
              await this.plugin.saveSettings();
              this.display();
            }).open();
          });
      });

    // 优先级模式
    new Setting(containerEl)
      .setName('执行优先级模式')
      .setDesc('当文件匹配多个规则时，决定哪个规则优先执行')
      .addDropdown(dropdown => {
        dropdown
          .addOption('rule', '📋 按规则顺序')
          .addOption('property', '📝 按属性值顺序')
          .setValue(this.plugin.settings.priorityMode || 'rule')
          .onChange(async (value) => {
            this.plugin.settings.priorityMode = value;
            await this.plugin.saveSettings();
            new Notice(`优先级模式: ${value === 'rule' ? '按规则顺序' : '按属性值顺序'}`);
          });
      });

    // 实时监控开关
    new Setting(containerEl)
      .setName('实时监控归档')
      .setDesc('开启时自动触发，关闭时只能手动触发')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.realTimeMonitoring !== false)
          .onChange(async (value) => {
            this.plugin.settings.realTimeMonitoring = value;
            await this.plugin.saveSettings();
            new Notice(value ? '实时监控已开启' : '实时监控已关闭');
          });
      });

    // 规则列表
    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: '规则列表' });

    const addButton = containerEl.createEl('button', { text: '+ 添加新规则' });
    addButton.style.marginBottom = '10px';
    addButton.onclick = () => {
      new RuleEditModal(this.app, this.plugin, null, async (rule) => {
        this.plugin.settings.rules.push(rule);
        await this.plugin.saveSettings();
        this.display();
      }).open();
    };

    if (this.plugin.settings.rules.length === 0) {
      containerEl.createDiv({ text: '暂无规则，请添加新规则' });
    } else {
      const table = containerEl.createEl('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';

      const thead = table.createEl('thead');
      const headerRow = thead.createEl('tr');
      ['', '#', '启用', '监控', '触发条件', '源文件夹', '目标文件夹', '阻止值', '模式', '操作'].forEach(text => {
        const th = headerRow.createEl('th');
        th.textContent = text;
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        th.style.borderBottom = '1px solid var(--background-modifier-border)';
      });

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

        // 编号
        const idCell = row.createEl('td');
        idCell.textContent = index + 1;
        idCell.style.padding = '8px';

        // 启用状态
        const enabledCell = row.createEl('td');
        enabledCell.textContent = rule.enabled ? '🔴' : '⭕';
        enabledCell.style.padding = '8px';

        // 监控模式
        const watchModeCell = row.createEl('td');
        watchModeCell.textContent = rule.watchMode === 'filename' ? '📄 文件名' : '🏷️ 属性';
        watchModeCell.style.padding = '8px';

        // 触发条件
        const triggerCell = row.createEl('td');
        triggerCell.textContent = rule.watchMode === 'filename' 
          ? (rule.filenamePattern || '-') 
          : `${rule.watchProperty}=${rule.triggerValue}`;
        triggerCell.style.padding = '8px';

        // 源文件夹
        const sourceFolderCell = row.createEl('td');
        sourceFolderCell.textContent = rule.archiveFolder ? (rule.sourceFolder || '-') : '-';
        sourceFolderCell.style.padding = '8px';

        // 目标文件夹
        const targetCell = row.createEl('td');
        targetCell.textContent = rule.targetFolder;
        targetCell.style.padding = '8px';

        // 阻止值
        const blockingCell = row.createEl('td');
        blockingCell.textContent = rule.blockingValue || '-';
        blockingCell.style.padding = '8px';

        // 模式
        const modeCell = row.createEl('td');
        if (rule.archiveFolder) {
          modeCell.textContent = '📁 文件夹';
        } else if (rule.copyMode) {
          modeCell.textContent = '📋 复制';
        } else {
          modeCell.textContent = '➡️ 移动';
        }
        modeCell.style.padding = '8px';

        // 操作按钮
        const actionsCell = row.createEl('td');
        actionsCell.style.padding = '8px';

        // 上移按钮
        if (index > 0) {
          const upBtn = actionsCell.createEl('button', { text: '⬆️' });
          upBtn.style.marginRight = '5px';
          upBtn.onclick = () => {
            this.moveRule(index, index - 1);
          };
        }

        // 下移按钮
        if (index < this.plugin.settings.rules.length - 1) {
          const downBtn = actionsCell.createEl('button', { text: '⬇️' });
          downBtn.style.marginRight = '5px';
          downBtn.onclick = () => {
            this.moveRule(index, index + 1);
          };
        }

        // 编辑按钮
        const editBtn = actionsCell.createEl('button', { text: '✏️' });
        editBtn.style.marginRight = '5px';
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
        deleteBtn.onclick = () => {
          this.plugin.settings.rules = this.plugin.settings.rules.filter(r => r.id !== rule.id);
          this.plugin.saveSettings();
          this.display();
        };
      });
    }

    // 批量操作
    if (this.plugin.settings.rules.length > 0) {
      containerEl.createEl('hr');
      const batchDiv = containerEl.createDiv();
      
      this.selectionStatus = batchDiv.createDiv();
      this.selectionStatus.textContent = '已选中 0 个规则';
      
      const buttonContainer = batchDiv.createDiv();
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '10px';
      buttonContainer.style.marginTop = '10px';

      const deleteButton = buttonContainer.createEl('button', { text: '🗑️ 删除选中' });
      deleteButton.onclick = () => this.batchDelete();

      const disableButton = buttonContainer.createEl('button', { text: '⏸️ 禁用选中' });
      disableButton.onclick = () => this.batchSetEnabled(false);

      const enableButton = buttonContainer.createEl('button', { text: '▶️ 启用选中' });
      enableButton.onclick = () => this.batchSetEnabled(true);
    }

    // 手动操作
    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: '手动操作' });

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

    // 作者信息
    containerEl.createEl('hr');
    const authorDiv = containerEl.createDiv();
    authorDiv.style.textAlign = 'center';
    authorDiv.style.padding = '20px';

    const authorTitle = authorDiv.createEl('h4');
    authorTitle.textContent = '作者';

    const authorButton = authorDiv.createEl('button');
    authorButton.textContent = '极拓工坊';
    authorButton.style.padding = '8px 24px';
    authorButton.style.fontSize = '1.1em';
    authorButton.onclick = () => {
      window.open('https://gitapp.net', '_blank');
    };

    const websiteHint = authorDiv.createEl('div');
    websiteHint.textContent = 'https://gitapp.net';
    websiteHint.style.marginTop = '10px';
    websiteHint.style.color = 'var(--text-muted)';
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
    new Notice('已删除选中的规则');
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
    new Notice(`${enabled ? '启用' : '禁用'}了选中的规则`);
  }

  async moveRule(fromIndex, toIndex) {
    const rules = this.plugin.settings.rules;
    if (fromIndex < 0 || fromIndex >= rules.length) return;
    if (toIndex < 0 || toIndex >= rules.length) return;
    
    const temp = rules[fromIndex];
    rules[fromIndex] = rules[toIndex];
    rules[toIndex] = temp;
    
    await this.plugin.saveSettings();
    this.display();
    new Notice('规则顺序已更新');
  }
}

module.exports = AutoMovePublishedArticlesPlugin;