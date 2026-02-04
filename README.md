# Auto Move File for Obsidian

**English** | [中文](README_zh.md)

**Website**: [https://gitapp.net](https://gitapp.net) *(Coming Soon)*

### 📺 Video Tutorials
- **YouTube**: [Watch Tutorial](https://youtu.be/VzaoMqYdZfk)
- **Bilibili**: [Obsidian自动整理插件：实现笔记自动归档，别再手动拖文件了！](https://www.bilibili.com/video/BV1xK6tBWES7/?share_source=copy_web&vd_source=2db5bc2d9b93b1d4e36c612c9d52221b)

**Made with ❤️ by 小新空**

---

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
