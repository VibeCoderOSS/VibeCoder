# VibeCoder

**Local AI powered code editing** for your frontend projects, built around **LM Studio**.

Generate, patch and rewrite files directly in the browser with a live preview.  
Runs fully locally from `index.html`. No build steps. No node_modules. Just vibe.



> ⚠️ Status: VibeCoder is **work in progress**.  
> Expect rough edges, missing features and breaking changes while things evolve.

---

## ✨ Features

- 🧠 Uses local models from **LM Studio** via its REST API
- 🧩 **Inline code edits**: models can patch parts of existing files instead of always regenerating everything
- 🔁 Smart patch vs full rewrite strategy (auto / patch only / rewrite only)
- 🖥️ Live preview iframe for HTML, CSS and JS projects
- 📁 Real filesystem integration via `showDirectoryPicker` (optional)
- 💾 Auto save for edited files
- 🎨 Modern UI with React and Tailwind, all browser side
- 🚫 No cloud: all requests stay on `localhost`
- Adjustable model settings (temperature, context length per answer)
- Stop button for running generations
- Optional image upload as context and as assets

---

## 🚀 Requirements

LLM: 

Use **at least a 20b model**. Everything below that will probably fail to adhere to the system prompt. 
I am working on making the parser more robust, so that smaller models which don't adhere to the system prompt in detail will still work.

Before you use VibeCoder, you **must** have:

1. **LM Studio installed**
2. At least one **chat completion capable model** downloaded
3. The **LM Studio Server running**

> VibeCoder will **not work** unless the LM Studio API server is started.

In LM Studio:

1. Go to the **Server** or **API** section
2. Start the **local REST server**  
3. Make sure it listens on something like:  
   `http://localhost:1234/v1`

VibeCoder assumes this default, but you can change the URL in the settings.

---

## 🛠️ Getting Started

1. **Start LM Studio server**

   - Open LM Studio  
   - Start the local API server  
   - Verify that `http://localhost:1234/v1/models` responds

2. **Open VibeCoder**

   - Open `index.html` in a modern browser (Chrome / Edge recommended)
   - You do not need any dev server or build tool

3. **Choose how to work**

   - Click **Open Project Folder** to work on real files  
     → Uses the browser File System Access API  
   - Or select **Use Virtual Filesystem**  
     → Files exist only in memory and can be downloaded as a zip

4. **Talk to your model**

   - Describe what you want:  
     “Create an index.html with a split layout and a sticky header”  
   - The model can:
     - create new files
     - **apply inline patches** to existing files
     - or fully rewrite files depending on the mode

---

## 🔧 Editing Modes

You can configure how VibeCoder asks the model to edit your project:

- `auto` (recommended):  
  Model decides whether to patch or rewrite based on change size

- `patch`:  
  Always request **patch blocks** to update smaller regions inside existing files

- `rewrite`:  
  Always request **full file rewrites**

These modes are configured via the **Settings** modal.

---

## 📡 Connection & Settings

In the **Settings** panel you can change:

- `API URL`  
  Default: `http://localhost:1234/v1`

- `Model`  
  VibeCoder can fetch the model list from LM Studio’s `/v1/models` endpoint

- `Edit Strategy`  
  `auto` / `patch` / `rewrite`

You can also see the current **system prompt** used to guide the model  
(read only, for transparency).

---

## 🧬 Inline Code Changes

VibeCoder is designed for **inline code manipulation**, not just “dump all code again”.

The model is instructed to:

- Use **patch blocks** for small edits (for example updating a function or a component)
- Use **full file blocks** only when refactoring or creating new files
- Respect the existing project structure as much as possible

This allows flows like:

- “Add a dark mode toggle, do not rewrite everything”
- “Fix the broken preview error”
- “Refactor the sidebar component only”

---

## 📦 Downloading Your Project

At any time you can:

- Copy the current file to the clipboard
- Download the whole project as a **zip file**

This works both for real filesystem projects and virtual projects.

---

## ⚠️ Work in Progress

VibeCoder is currently **experimental**:

- UI and behavior may change without stability guarantees
- Error handling is still improving
- Some edge cases in patching and file detection may fail


Feedback, issues and ideas are very welcome.

---

## 📜 License & Usage

VibeCoder is released under the **GNU Affero General Public License v3.0 (AGPLv3)**.

This means:

| Allowed | Not Allowed |
|--------|-------------|
| ✨ Forking & modifying the code | ❌ Using it inside closed source or proprietary apps without releasing the source |
| 📦 Redistributing under AGPLv3 | ❌ Removing attribution or license information |
| 🧑‍🏫 Educational, research and open source use | ❌ Selling closed source derivatives based on this code |

If you plan to use VibeCoder in a commercial or restricted environment and are unsure whether your use case is compatible with AGPLv3:

📩 Please contact the maintainer first.

The intention is simple:

> **Open source should stay open.  
> No silent closed forks. No hidden monetisation of community work.**

---

## 🤝 Contributing

Pull Requests are welcome!

- For larger changes, please start with an Issue
- Keep PRs focused and well described
- The maintainer decides what gets merged into the main project

Thank you for helping improve VibeCoder 💙

---

## 🌱 Vision

VibeCoder is an experiment in **local first AI tooling**:

- You keep control of your code
- You keep everything on your own machine
- The model works *with* your existing files, not against them

Let us see how far we can go with local models, smart patching and a bit of vibe ⚡
