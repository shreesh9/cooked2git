<div align="center">

# 🧩 Cooked2Git — LeetCode Auto-Sync

> **Zero-Server, Zero-Telemetry, Direct Browser-to-GitHub Solution Tracker**

![Version](https://img.shields.io/badge/version-0.1.0-FF0B3A?style=for-the-badge&logo=googlechrome&logoColor=white)
![Build Status](https://img.shields.io/badge/build-passing-39FF88?style=for-the-badge&logo=githubactions&logoColor=white)
![Privacy](https://img.shields.io/badge/privacy-100%25%20Zero--Trust-FFB800?style=for-the-badge&logo=shield&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

</div>

---

## ⚡ Overview

**Cooked2Git** is a privacy-first, zero-clutter Chrome extension built for developers. It automatically intercepts accepted submissions on **LeetCode**, extracting solution code, runtime stats, and memory percentiles, then pushes them directly to your personal GitHub repository.

- 🔒 **Zero Third-Party Servers**: Requests go directly from your browser to `api.github.com`.
- 🚫 **Zero Telemetry**: No analytics, no tracking, no data collection.
- 🎯 **Zero Host Page Clutter**: Completely overlay-free DOM execution — zero annoying floating popups on LeetCode.
- 📁 **Smart Folder Categorization**: Automatically routes solutions to `/easy`, `/medium`, and `/hard` folders.

---

## 📸 Personal Repository README Template

When syncing your solutions to GitHub, your repository will look clean and structured:

```markdown
# 🧩 LeetCode Solutions

> Auto-synced with **[Cooked2Git](https://github.com/shreesh9/cooked2git)** 🚀  
> Zero servers, zero telemetry, direct browser-to-GitHub synchronization.

---

## 📊 Overview

Welcome to my personal LeetCode solutions repository! Every time I solve a problem on LeetCode, my solutions are automatically pushed here with difficulty categories, runtime performance, and memory percentiles.

| Difficulty | Badge | Folder Path |
| :--- | :--- | :--- |
| **Easy** | ![Easy](https://img.shields.io/badge/Difficulty-Easy-39FF88?style=for-the-badge) | [`/easy`](./easy) |
| **Medium** | ![Medium](https://img.shields.io/badge/Difficulty-Medium-FFB800?style=for-the-badge) | [`/medium`](./medium) |
| **Hard** | ![Hard](https://img.shields.io/badge/Difficulty-Hard-FF3355?style=for-the-badge) | [`/hard`](./hard) |

---

### 👨‍💻 Developer Profile

- **Developer**: Shreesh Nalawade (`@shxeesh`)
- 🐙 **GitHub**: [@shreesh9](https://github.com/shreesh9)
- 🌐 **Linktree**: [linktr.ee/shreesh9](https://linktr.ee/shreesh9)
- ✉️ **Email**: [shreeshnalawade9@gmail.com](mailto:shreeshnalawade9@gmail.com)
```

---

## 🔥 Features

| Feature | Description |
| :--- | :--- |
| **1-Click OAuth Setup** | Seamlessly connects your GitHub account with pre-filled permission scopes. |
| **Automatic Repo Creation** | Auto-initializes target repositories on GitHub if they don't exist. |
| **Monaco DOM Fallback** | Captures code directly from Monaco Editor DOM lines if API payloads omit source text. |
| **Offline Retry Queue** | Automatically queues pushes when offline and syncs exponentially upon reconnecting. |
| **Streak & Stats Tracker** | Tracks active daily streaks, easy/medium/hard counters inside extension popup. |

---

## 🛠️ Installation & Building

```bash
# 1. Clone the repository
git clone https://github.com/shreesh9/cooked2git.git
cd cooked2git

# 2. Install dependencies
npm install

# 3. Run unit tests
npm test

# 4. Build extension bundle for production
npm run build
```

Then load the extension into Chrome:
1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode** (toggle in top right).
3. Click **Load unpacked** and select the `dist` folder.

---

## 👤 Developer Info

<div align="center">

- **Developer**: **Shreesh Nalawade** (`@shxeesh`)
- 🐙 **GitHub**: [@shreesh9](https://github.com/shreesh9)
- 🌐 **Linktree**: [linktr.ee/shreesh9](https://linktr.ee/shreesh9)
- ✉️ **Email**: [shreeshnalawade9@gmail.com](mailto:shreeshnalawade9@gmail.com)

Crafted with 🔥 by **Shreesh Nalawade** · Powered by **Cooked2Git**

</div>
