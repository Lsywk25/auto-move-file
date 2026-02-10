# Auto Move File for Obsidian

**English** | [中文](README_zh.md)

**Website**: [https://gitapp.net](https://gitapp.net) *(Coming Soon)*

### 📺 Video Tutorials
- **YouTube**: [Watch Tutorial](https://youtu.be/VzaoMqYdZfk)
- **Bilibili**: [Obsidian自动整理插件：实现笔记自动归档，别再手动拖文件了！](https://www.bilibili.com/video/BV1xK6tBWES7/?share_source=copy_web&vd_source=2db5bc2d9b93b1d4e36c612c9d52221b)

**Made with ❤️ by 小新空**


An Obsidian plugin that automatically moves or copies files (or folders) based on frontmatter or filename rules. Supports monitoring `tags`, `status`, `category`, and filename patterns.

### 🚀 Features

- **Automatic Move/Copy**: Move or copy files to target folders
- **Multi-Rule Monitoring (Property/Filename)**: Create multiple rules that watch frontmatter or filenames
- **Flexible Monitoring Logic**: Supports AND/OR combinations for folders and keywords
- **Custom Monitoring Attributes**: Monitor any frontmatter properties like `tags`, `status`, `category`
- **Multiple Data Types**: Supports array types (like `tags`) and string types (like `status`)
- **Folder Archiving**: Archive an entire folder to a target folder
- **Rule Order**: Rules are matched in order; first match wins
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
2. Modify frontmatter properties or rename the file to match a rule
3. Save the file (Ctrl + S) or finish the rename
4. The file (or folder) is automatically moved/copied to the target directory

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

##### Example 3: Monitor filename

**Filename:**
```
Project-已发.md
```

**Configuration:**
- Watch Mode: `filename`
- Filename Pattern: `已发`

**Trigger Move:** Rename the file so it includes `已发`

### ⚙️ Configuration

1. **Rules (Multi-Rule)**: Add multiple rules and order them
2. **Watch Mode**: Choose property or filename monitoring per rule
3. **Monitor Property**: Choose which frontmatter property to monitor
4. **Filename Pattern**: Required text for filename rules
5. **Move/Copy Mode**: Move or copy files to the target folder
6. **Folder Archive**: Optionally archive an entire source folder
7. **Source Folders**: Select folders to monitor for changes
8. **Target Folder**: Choose destination folder for moved/copied files
9. **Delay**: Set delay in milliseconds to avoid frequent triggers

### 🤝 Support

- **Issues**: Report bugs on GitHub
- **Feature Requests**: Submit suggestions via GitHub Issues
- **Documentation**: Visit our website for detailed guides

### 📄 License

MIT License
