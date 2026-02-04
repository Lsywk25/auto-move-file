# Auto Move File for Obsidian

[English](#english) | [中文](#中文)

**Website**: [https://gitapp.net](https://gitapp.net) *(Coming Soon | 即将推出)*

### 📺 Video Tutorials | 视频教程
- **YouTube**: [Watch Tutorial | 观看教程](https://youtu.be/VzaoMqYdZfk)
- **Bilibili**: [Obsidian自动整理插件：实现笔记自动归档，别再手动拖文件了！](https://www.bilibili.com/video/BV1xK6tBWES7/?share_source=copy_web&vd_source=2db5bc2d9b93b1d4e36c612c9d52221b)

**Made with ❤️ by 小新空**

---

## English

An Obsidian plugin that automatically moves files to specified directories based on frontmatter properties. Supports monitoring `tags`, `status`, `category`, and any other frontmatter attributes.

### 🚀 Features

- **Automatic File Moving**: Automatically moves files based on frontmatter property values
- **Flexible Monitoring Logic**: Supports AND/OR combinations for folders and keywords
- **Custom Monitoring Attributes**: Monitor any frontmatter properties like `tags`, `status`, `category`
- **Multiple Data Types**: Supports array types (like `tags`) and string types (like `status`)
- **Folder Selector**: Visual folder selection interface
- **Perfect Chinese Support**: Full support for Windows paths and Chinese characters
- **Adjustable Delay**: Customizable delay to avoid frequent triggers

### 📦 Installation

#### Method 1: Manual Installation

1. Download the repository files
2. Extract to your Obsidian vault's `.obsidian/plugins/` directory
3. Restart Obsidian
4. Go to **Settings** → **Community Plugins**
5. Find **Auto Move File** and enable the plugin

#### Method 2: Install from GitHub

1. Download `main.js` and `manifest.json`
2. Place files in `.obsidian/plugins/auto-move-file/` directory
3. Restart Obsidian and enable the plugin

### 🎯 Usage

#### Basic Workflow

1. Open any Markdown file
2. Modify the file's frontmatter properties (e.g., change tags to "published")
3. Save the file (Ctrl + S)
4. File automatically moves to the target directory

#### Configuration Examples

##### Example 1: Monitor tags (Default)

**Frontmatter:**
```yaml
---
tags: [draft, article]
---
```

**Configuration:**
- Monitor Property: `tags`
- Published Tag: `published`
- Draft Tag: `draft`

**Trigger Move:** Change `tags` to `[published]` and save

##### Example 2: Monitor status

**Frontmatter:**
```yaml
---
status: draft
---
```

**Configuration:**
- Monitor Property: `status`
- Published Value: `published`
- Draft Value: `draft`

**Trigger Move:** Change `status` to `published` and save

### ⚙️ Configuration

1. **Monitor Property**: Choose which frontmatter property to monitor
2. **Published/Draft Values**: Set values that trigger file movement
3. **Source Folders**: Select folders to monitor for changes
4. **Target Folder**: Choose destination folder for moved files
5. **Delay**: Set delay in milliseconds to avoid frequent triggers

### 🤝 Support

- **Issues**: Report bugs on GitHub
- **Feature Requests**: Submit suggestions via GitHub Issues
- **Documentation**: Visit our website for detailed guides

### 📄 License

MIT License

---

## 中文

一个 Obsidian 插件，根据 frontmatter 属性自动将文件移动到指定目录。支持监控 `tags`、`status`、`category` 等任意属性。

### 🚀 功能特性

- **自动移动文件**：根据 frontmatter 属性值自动移动文件
- **灵活监控逻辑**：支持监控文件夹、关键词的 AND/OR 组合
- **自定义监控属性**：可监控 `tags`、`status`、`category` 等任意 frontmatter 属性
- **多种数据类型**：支持数组类型（如 `tags`）和字符串类型（如 `status`）
- **文件夹选择器**：可视化选择目标文件夹
- **完美支持中文**：支持 Windows 路径和中文路径
- **可调延迟**：避免频繁触发，可自定义延迟时间

### 📦 安装

#### 方法一：手动安装

1. 下载仓库的文件
2. 解压到你的 Obsidian vault 的 `.obsidian/plugins/` 目录
3. 重启 Obsidian
4. 进入 **设置** → **社区插件**
5. 找到 **Auto Move File**，启用插件

### 方法二：从 GitHub 安装

1. 下载 `main.js` 和 `manifest.json`
2. 将文件放入 `.obsidian/plugins/auto-move-file/` 目录
3. 重启 Obsidian 并启用插件

### 🎯 使用说明

#### 基本流程

1. 打开任意 Markdown 文件
2. 修改文件的 frontmatter 属性（如将标签改为"已发"）
3. 保存文件（Ctrl + S）
4. 文件自动移动到目标目录

#### 配置示例

##### 示例 1：监控 tags（默认）

**Frontmatter：**
```yaml
---
tags: [待发, 文章]
---
```

**配置：**
- 监控属性：`tags`
- 已发标签：`已发`
- 待发标签：`待发`

**触发移动：** 将 `tags` 改为 `[已发]` 并保存

##### 示例 2：监控 status

**Frontmatter：**
```yaml
---
status: 待发
---
```

**配置：**
- 监控属性：`status`
- 已发值：`已发`
- 待发值：`待发`

**触发移动：** 将 `status` 改为 `已发` 并保存

### ⚙️ 配置说明

1. **监控属性**：选择要监控的 frontmatter 属性
2. **已发/待发值**：设置触发文件移动的值
3. **源文件夹**：选择要监控变化的文件夹
4. **目标文件夹**：选择移动文件的目标目录
5. **延迟设置**：设置延迟毫秒数以避免频繁触发

### 🤝 支持

- **问题反馈**：在 GitHub 报告 bug
- **功能请求**：通过 GitHub Issues 提交建议
- **文档**：访问我们的网站查看详细指南

### 📄 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

如果你喜欢这个插件，请给个 Star ⭐
