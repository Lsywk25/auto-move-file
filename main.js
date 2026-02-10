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
      blockingValue: '待发',
      copyMode: false,  // true=复制模式，false=移动模式
      watchMode: 'property',  // 'property'=监控属性, 'filename'=监控文件名
      archiveFolder: false,  // true=归档整个文件夹, false=归档单个文件
      filenamePattern: '',  // 文件名包含的字符串
      sourceFolder: ''  // 源文件夹路径（仅在文件夹归档模式下使用）
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
            // 重新打开模态框以更新界面
            this.close();
            new RuleEditModal(this.app, this.plugin, this.rule, this.onSave).open();
          });
      });

    // 根据监控模式显示不同的配置项
    if (this.rule.watchMode === 'property') {
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
        .setDesc('当属性包含此值时，触发归档')
        .addText(text => {
          text
            .setPlaceholder('已发')
            .setValue(this.rule.triggerValue)
            .onChange(value => {
              this.rule.triggerValue = value.trim();
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
    } else {
      // 文件名模式（仅在文件名监控模式下显示）
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
            // 重新打开模态框以更新界面
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

    // 监听文件重命名事件（用于文件名监控模式）
    this.registerEvent(
      this.app.vault.on('rename', (file, oldPath) => {
        this.onFileRenamed(file, oldPath);
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

    // 检查是否有文件名监控模式的规则
    const hasFilenameRules = this.settings.rules && this.settings.rules.some(rule => 
      rule.enabled && rule.watchMode === 'filename'
    );
    
    if (hasFilenameRules) {
      console.log('  -> Has filename monitoring rules, skipping modify event (waiting for rename)');
      return;
    }

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

  async onFileRenamed(file, oldPath) {
    console.log('=== File renamed event triggered ===');
    console.log('File renamed:', oldPath, '->', file.path);
    console.log('New filename:', file.name);

    // 延迟执行
    setTimeout(() => {
      console.log('=== Delay elapsed, checking renamed file now ===');
      const freshFile = this.app.vault.getAbstractFileByPath(file.path);
      if (freshFile) {
        this.checkAndMoveFile(freshFile, true); // 传入true表示这是重命名事件
      } else {
        console.log('  -> File no longer exists:', file.path);
      }
    }, this.settings.delayTime);
  }

  async checkAndMoveFile(file, isRenamed = false) {
    console.log('=== checkAndMoveFile called ===');
    console.log('File path:', file.path);
    console.log('File name:', file.name);
    console.log('Is renamed event:', isRenamed);

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

    // 检查规则是否存在
    if (!this.settings.rules || this.settings.rules.length === 0) {
      console.log('  -> No rules defined, skipping');
      return;
    }

    // 遍历规则，检查是否有匹配的
    for (const rule of this.settings.rules) {
      if (!rule.enabled) {
        console.log(`  -> Rule ${rule.id} is disabled, skipping`);
        continue;
      }

      console.log(`  -> Checking rule ${rule.id}...`);
      console.log(`  -> Watch mode: ${rule.watchMode || 'property'}`);

      let matchesTrigger = false;
      let hasBlocking = false;

      if (rule.watchMode === 'filename') {
        // 文件名监控模式：只在重命名事件时处理
        if (!isRenamed) {
          console.log(`  -> Filename monitoring rule ${rule.id}, but not a rename event, skipping`);
          continue;
        }
        
        const filename = file.name;
        const pattern = rule.filenamePattern;
        
        console.log(`  -> Filename: ${filename}, Pattern: ${pattern}`);
        
        if (!pattern) {
          console.log(`  -> No filename pattern set, skipping rule ${rule.id}`);
          continue;
        }

        // 直接使用字符串包含匹配（不区分大小写）
        matchesTrigger = filename.toLowerCase().includes(pattern.toLowerCase());
        console.log(`  -> String contains match result: ${matchesTrigger}`);
        console.log(`  -> Checking if "${filename}" contains "${pattern}"`);
        
        hasBlocking = false; // 文件名模式不支持阻止值
      } else {
        // 属性监控模式
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache || !cache.frontmatter) {
          console.log('  -> No frontmatter found, skipping rule');
          continue;
        }

        // 获取属性值
        const propertyValue = cache.frontmatter[rule.watchProperty];
        if (!propertyValue) {
          console.log(`  -> Property '${rule.watchProperty}' not found, skipping rule ${rule.id}`);
          continue;
        }

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
      }

      console.log(`  -> Matches trigger: ${matchesTrigger}, Has blocking: ${hasBlocking}`);

      // 匹配且不阻止 → 执行归档操作
      if (matchesTrigger && !hasBlocking) {
        if (rule.archiveFolder) {
          // 文件夹归档模式
          console.log(`  -> Rule ${rule.id} matched! Archiving folder to ${rule.targetFolder}`);
          await this.archiveFolder(file, rule.targetFolder, rule.sourceFolder);
          console.log('=== checkAndMoveFile completed (folder archived) ===\n');
        } else if (rule.copyMode) {
          // 复制文件模式
          console.log(`  -> Rule ${rule.id} matched! Copying file to ${rule.targetFolder}`);
          await this.copyFile(file, rule.targetFolder);
          console.log('=== checkAndMoveFile completed (file copied) ===\n');
        } else {
          // 移动文件模式
          console.log(`  -> Rule ${rule.id} matched! Moving file to ${rule.targetFolder}`);
          await this.moveFile(file, rule.targetFolder);
          console.log('=== checkAndMoveFile completed (file moved) ===\n');
        }
        return;
      }
    }

    console.log('  -> No rule matched, no move needed');
    console.log('=== checkAndMoveFile completed (no move) ===\n');
  }

  async archiveFolder(file, targetDir, sourceFolderPath) {
    console.log('archiveFolder called for:', file.path, '->', targetDir);
    console.log('Source folder path:', sourceFolderPath);

    // 检查源文件夹路径是否指定
    if (!sourceFolderPath || sourceFolderPath.trim() === '') {
      console.log('No source folder specified, using file parent folder');
      // 如果没有指定源文件夹，使用文件所在的文件夹
      const fileParent = file.parent;
      if (!fileParent) {
        console.log('File is in root directory, cannot archive folder');
        new Notice('文件在根目录中，无法归档文件夹');
        return;
      }
      sourceFolderPath = fileParent.path;
    }

    // 获取源文件夹对象
    const sourceFolder = this.app.vault.getAbstractFileByPath(sourceFolderPath);
    if (!sourceFolder || sourceFolder.children === undefined) {
      console.log('Source folder not found or is not a folder:', sourceFolderPath);
      new Notice(`源文件夹不存在或不是文件夹: ${sourceFolderPath}`);
      return;
    }

    const sourceFolderName = sourceFolder.name;
    console.log('Source folder name:', sourceFolderName);

    // 目标路径
    const targetPath = `${targetDir}/${sourceFolderName}`;
    console.log('Target folder path:', targetPath);

    // 检查目标文件夹是否已存在
    const existingFolder = this.app.vault.getAbstractFileByPath(targetPath);
    if (existingFolder) {
      console.log(`文件夹 ${sourceFolderName} 已存在于目标目录`);
      new Notice(`文件夹 ${sourceFolderName} 已存在于目标目录`);
      return;
    }

    // 确保目标目录存在
    const targetFolder = this.app.vault.getAbstractFileByPath(targetDir);
    if (!targetFolder) {
      console.log('Creating target directory:', targetDir);
      await this.app.vault.createFolder(targetDir);
    }

    // 移动文件夹
    try {
      console.log('Renaming folder...');
      await this.app.fileManager.renameFile(sourceFolder, targetPath);
      console.log(`文件夹 ${sourceFolderName} 已移动到 ${targetDir}`);

      // 显示通知
      new Notice(`文件夹 "${sourceFolderName}" 已归档到 ${targetDir}`);
    } catch (error) {
      console.error('归档文件夹失败:', error);
      new Notice(`归档文件夹失败: ${error.message}`, 5000);
    }
  }

  async copyFile(file, targetDir) {
    console.log('copyFile called for:', file.path, '->', targetDir);

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

    // 复制文件
    try {
      console.log('Copying file...');
      // 读取原文件内容
      const content = await this.app.vault.read(file);
      // 在目标位置创建新文件
      await this.app.vault.create(targetPath, content);
      console.log(`文件 ${file.name} 已复制到 ${targetDir}`);

      // 显示通知
      new Notice(`文章 "${file.name}" 已复制到 ${targetDir}`);
    } catch (error) {
      console.error('复制文件失败:', error);
      new Notice(`复制文件失败: ${error.message}`, 5000);
    }
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
              blockingValue: savedSettings.pendingTag || '待发',
              copyMode: false,
              watchMode: 'property',
              archiveFolder: false,
              filenamePattern: '',
              sourceFolder: ''
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
      ['', '#', '启用', '监控模式', '触发条件', '源文件夹', '目标文件夹', '阻止值', '模式', '操作'].forEach(text => {
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

        // 监控模式
        const watchModeCell = row.createEl('td');
        watchModeCell.textContent = rule.watchMode === 'filename' ? '📄 文件名' : '🏷️ 属性';
        watchModeCell.style.padding = '8px';
        watchModeCell.style.textAlign = 'center';
        watchModeCell.style.color = rule.watchMode === 'filename' ? 'var(--text-accent)' : 'var(--text-normal)';

        // 触发条件
        const triggerCell = row.createEl('td');
        if (rule.watchMode === 'filename') {
          triggerCell.textContent = rule.filenamePattern ? `包含: ${rule.filenamePattern}` : '-';
        } else {
          triggerCell.textContent = `${rule.watchProperty}=${rule.triggerValue}`;
        }
        triggerCell.style.padding = '8px';
        triggerCell.style.fontWeight = 'bold';
        triggerCell.style.color = 'var(--text-accent)';

        // 源文件夹（仅在文件夹归档模式下显示）
        const sourceFolderCell = row.createEl('td');
        if (rule.archiveFolder) {
          sourceFolderCell.textContent = rule.sourceFolder || '-';
          sourceFolderCell.style.color = rule.sourceFolder ? 'var(--text-normal)' : 'var(--text-muted)';
        } else {
          sourceFolderCell.textContent = '-';
          sourceFolderCell.style.color = 'var(--text-muted)';
        }
        sourceFolderCell.style.padding = '8px';

        // 目标文件夹
        const targetCell = row.createEl('td');
        targetCell.textContent = rule.targetFolder;
        targetCell.style.padding = '8px';

        // 阻止值
        const blockingCell = row.createEl('td');
        if (rule.watchMode === 'filename') {
          blockingCell.textContent = '-';
          blockingCell.style.color = 'var(--text-muted)';
        } else {
          blockingCell.textContent = rule.blockingValue || '-';
          blockingCell.style.color = rule.blockingValue ? 'var(--text-warning)' : 'var(--text-muted)';
        }
        blockingCell.style.padding = '8px';

        // 操作模式
        const modeCell = row.createEl('td');
        if (rule.archiveFolder) {
          modeCell.textContent = '📁 文件夹';
          modeCell.style.color = 'var(--text-warning)';
          modeCell.style.fontWeight = 'bold';
        } else if (rule.copyMode) {
          modeCell.textContent = '📋 复制';
          modeCell.style.color = 'var(--text-accent)';
        } else {
          modeCell.textContent = '➡️ 移动';
          modeCell.style.color = 'var(--text-normal)';
        }
        modeCell.style.padding = '8px';
        modeCell.style.textAlign = 'center';

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
