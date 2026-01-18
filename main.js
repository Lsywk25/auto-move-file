const { Plugin, Notice, PluginSettingTab, Setting, FuzzySuggestModal } = require('obsidian');

// 默认配置
const DEFAULT_SETTINGS = {
  targetFolder: '笔记/自媒体文章笔记',
  watchFolder: '',
  keywords: '白鹿原',
  watchProperty: 'tags',
  publishedTag: '已发',
  pendingTag: '待发',
  delayTime: 2000
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
    console.log('Auto Move Published Articles plugin loaded');
    new Notice('Auto Move Published Articles plugin loaded');

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
    // - 如果都没设置：监控根目录所有文件
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
      // 都没设置：监控根目录
      shouldMonitor = !file.path.includes('/');
      console.log('  -> No settings, checking root directory only');
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

    const propertyValue = cache.frontmatter[this.settings.watchProperty];

    // 支持数组类型和字符串类型
    let hasPublished = false;
    let hasPending = false;

    if (Array.isArray(propertyValue)) {
      // 数组类型：使用 includes 检查
      hasPublished = propertyValue.includes(this.settings.publishedTag);
      hasPending = propertyValue.includes(this.settings.pendingTag);
      console.log(`  -> Property '${this.settings.watchProperty}' (array):`, propertyValue);
    } else if (typeof propertyValue === 'string') {
      // 字符串类型：使用完全相等检查
      hasPublished = propertyValue === this.settings.publishedTag;
      hasPending = propertyValue === this.settings.pendingTag;
      console.log(`  -> Property '${this.settings.watchProperty}' (string):`, propertyValue);
    } else {
      // 其他类型或不存在的属性
      console.log(`  -> Property '${this.settings.watchProperty}' is not valid or missing`);
      return;
    }

    console.log('  -> Has published:', hasPublished, ', Has pending:', hasPending);

    // 只有包含"已发"且不包含"待发"时才移动
    if (hasPublished && !hasPending) {
      console.log('  -> Moving file...');
      await this.moveFile(file);
    } else {
      console.log('  -> No move needed');
    }

    console.log('=== checkAndMoveFile completed ===\n');
  }

  async moveFile(file) {
    const targetDir = this.settings.targetFolder;

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
      this.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
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
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: '自动移动文章插件设置' });

    // 目标文件夹
    new Setting(containerEl)
      .setName('目标文件夹')
      .setDesc('文章移动的目标文件夹路径（支持相对路径和绝对路径）')
      .addText(text => {
        text
          .setPlaceholder('笔记/自媒体文章笔记')
          .setValue(this.plugin.settings.targetFolder)
          .onChange(async (value) => {
            this.plugin.settings.targetFolder = normalizePath(value);
            await this.plugin.saveSettings();
          });
      })
      .addButton(button => {
        button
          .setButtonText('选择文件夹')
          .onClick(() => {
            new FolderSuggestModal(this.app, async (folder) => {
              this.plugin.settings.targetFolder = folder;
              await this.plugin.saveSettings();
              this.display(); // 刷新设置页
            }).open();
          });
      });

    // 监控文件夹
    new Setting(containerEl)
      .setName('监控文件夹')
      .setDesc('监控的文件夹路径（留空则监控整个仓库，支持相对路径和绝对路径）。注意：如果同时设置了监控文件夹和关键词，则使用 AND 关系（两个条件都要满足）；如果只设置一个，则只检查该条件。')
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
              this.display(); // 刷新设置页
            }).open();
          });
      });

    // 监控关键词
    new Setting(containerEl)
      .setName('监控关键词')
      .setDesc('文件名包含的关键词（留空则忽略，多个关键词用逗号分隔）。注意：如果同时设置了监控文件夹和关键词，则使用 AND 关系（两个条件都要满足）；如果只设置一个，则只检查该条件；如果都留空，则监控根目录所有文件。')
      .addText(text => {
        text
          .setPlaceholder('留空则忽略此条件')
          .setValue(this.plugin.settings.keywords)
          .onChange(async (value) => {
            this.plugin.settings.keywords = value;
            await this.plugin.saveSettings();
          });
      });

    // 监控属性
    new Setting(containerEl)
      .setName('监控属性')
      .setDesc('监控的 frontmatter 属性名（默认：tags）。可以是 tags、status、category 等任意属性。')
      .addText(text => {
        text
          .setPlaceholder('tags')
          .setValue(this.plugin.settings.watchProperty)
          .onChange(async (value) => {
            this.plugin.settings.watchProperty = value.trim() || 'tags';
            await this.plugin.saveSettings();
          });
      });

    // 已发标签
    new Setting(containerEl)
      .setName('已发标签')
      .setDesc('触发移动的标签名')
      .addText(text => {
        text
          .setPlaceholder('已发')
          .setValue(this.plugin.settings.publishedTag)
          .onChange(async (value) => {
            this.plugin.settings.publishedTag = value.trim();
            await this.plugin.saveSettings();
          });
      });

    // 待发标签
    new Setting(containerEl)
      .setName('待发标签')
      .setDesc('阻止移动的标签名')
      .addText(text => {
        text
          .setPlaceholder('待发')
          .setValue(this.plugin.settings.pendingTag)
          .onChange(async (value) => {
            this.plugin.settings.pendingTag = value.trim();
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

    // 测试按钮
    new Setting(containerEl)
      .setName('测试配置')
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

    // 显示当前配置
    containerEl.createEl('hr');
    containerEl.createEl('h3', { text: '当前配置' });

    const configDiv = containerEl.createDiv();
    configDiv.style.fontSize = '0.9em';
    configDiv.style.padding = '10px';
    configDiv.style.backgroundColor = 'var(--background-modifier-form-field)';
    configDiv.style.borderRadius = '5px';

    const normalizedTarget = normalizePath(this.plugin.settings.targetFolder);
    const normalizedWatch = normalizePath(this.plugin.settings.watchFolder);
    const hasFolderSetting = normalizedWatch && normalizedWatch.trim() !== '';
    const hasKeywordsSetting = this.plugin.settings.keywords && this.plugin.settings.keywords.trim() !== '';

    // 使用 createDocumentFragment 避免 HTML 标签显示问题
    const configEl = document.createDocumentFragment();

    const addConfigLine = (label, value) => {
      const line = document.createElement('div');
      line.style.marginBottom = '4px';
      line.innerHTML = `<strong>${label}：</strong>${value}`;
      return line;
    };

    // 添加监控逻辑
    const logicLine = document.createElement('div');
    logicLine.style.marginBottom = '8px';
    logicLine.style.padding = '4px';
    logicLine.style.backgroundColor = 'var(--background-modifier-hover)';
    logicLine.style.borderRadius = '3px';

    let logicText = '';
    if (hasFolderSetting && hasKeywordsSetting) {
      logicText = '监控逻辑：AND 关系（既在文件夹中又包含关键词）';
    } else if (hasFolderSetting) {
      logicText = '监控逻辑：只检查监控文件夹';
    } else if (hasKeywordsSetting) {
      logicText = '监控逻辑：只检查监控关键词';
    } else {
      logicText = '监控逻辑：监控根目录所有文件';
    }
    logicLine.innerHTML = `<strong>${logicText}</strong>`;
    configEl.appendChild(logicLine);

    configEl.appendChild(addConfigLine('目标文件夹', normalizedTarget));
    configEl.appendChild(addConfigLine('监控文件夹', normalizedWatch || '未设置'));
    configEl.appendChild(addConfigLine('监控关键词', this.plugin.settings.keywords || '未设置'));
    configEl.appendChild(addConfigLine('监控属性', this.plugin.settings.watchProperty));
    configEl.appendChild(addConfigLine('已发标签', this.plugin.settings.publishedTag));
    configEl.appendChild(addConfigLine('待发标签', this.plugin.settings.pendingTag));
    configEl.appendChild(addConfigLine('延迟时间', this.plugin.settings.delayTime + 'ms'));

    configDiv.appendChild(configEl);

    // 添加作者信息
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

    // 创建可点击的作者按钮
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

    // 悬停效果
    authorButton.onmouseenter = () => {
      authorButton.style.transform = 'translateY(-2px)';
      authorButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    };
    authorButton.onmouseleave = () => {
      authorButton.style.transform = 'translateY(0)';
      authorButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    };

    // 点击事件
    authorButton.onclick = () => {
      // 复制到剪贴板
      navigator.clipboard.writeText('小新空').then(() => {
        new Notice('已复制「小新空」到剪贴板，请在微信中搜索');
      }).catch(() => {
        // 如果复制失败，打开微信网页版
        window.open('https://weixin.qq.com/', '_blank');
      });
    };

    authorDiv.appendChild(authorButton);

    // 添加微信公众号提示
    const wechatHint = document.createElement('div');
    wechatHint.textContent = '微信公众号：小新空';
    wechatHint.style.marginTop = '12px';
    wechatHint.style.color = 'var(--text-muted)';
    wechatHint.style.fontSize = '0.85em';
    authorDiv.appendChild(wechatHint);

    // 添加搜索提示
    const searchHint = document.createElement('div');
    searchHint.textContent = '点击上方按钮，在微信中搜索「小新空」';
    searchHint.style.marginTop = '4px';
    searchHint.style.color = 'var(--text-faint)';
    searchHint.style.fontSize = '0.8em';
    authorDiv.appendChild(searchHint);
  }
}

module.exports = AutoMovePublishedArticlesPlugin;
