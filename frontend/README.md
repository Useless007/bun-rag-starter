# 🎨 Frontend - RAG Web Interface# Svelte + TS + Vite

Frontend ของระบบ RAG ที่สร้างด้วย Svelte 5 + ViteThis template should help get you started developing with Svelte and TypeScript in Vite.

## ✨ เทคโนโลจีหลัก## Recommended IDE Setup

- **Framework**: Svelte 5 (with Runes)[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

- **Build Tool**: Vite 7

- **Language**: TypeScript## Need an official Svelte framework?

- **Styling**: CSS (scoped)

Check out [SvelteKit](https://github.com/sveltejs/kit#readme), which is also powered by Vite. Deploy anywhere with its serverless-first approach and adapt to various platforms, with out of the box support for TypeScript, SCSS, and Less, and easily-added support for mdsvex, GraphQL, PostCSS, Tailwind CSS, and more.

## 📁 โครงสร้างไฟล์

## Technical considerations

```

frontend/**Why use this over SvelteKit?**

├── src/

│   ├── main.ts                      # Entry point- It brings its own routing solution which might not be preferable for some users.

│   ├── App.svelte                   # Main app component- It is first and foremost a framework that just happens to use Vite under the hood, not a Vite app.

│   ├── app.css                      # Global styles

│   └── lib/This template contains as little as possible to get started with Vite + TypeScript + Svelte, while taking into account the developer experience with regards to HMR and intellisense. It demonstrates capabilities on par with the other `create-vite` templates and is a good starting point for beginners dipping their toes into a Vite + Svelte project.

│       ├── DocumentManager.svelte   # จัดการเอกสาร

│       └── ChatInterface.svelte     # แชทอินเตอร์เฟสShould you later need the extended capabilities and extensibility provided by SvelteKit, the template has been structured similarly to SvelteKit so that it is easy to migrate.

├── public/                          # Static assets

├── index.html                       # HTML template**Why `global.d.ts` instead of `compilerOptions.types` inside `jsconfig.json` or `tsconfig.json`?**

├── package.json                     # Dependencies

├── vite.config.ts                   # Vite configSetting `compilerOptions.types` shuts out all other types not explicitly listed in the configuration. Using triple-slash references keeps the default TypeScript setting of accepting type information from the entire workspace, while also adding `svelte` and `vite/client` type information.

├── tsconfig.json                    # TypeScript config

└── .env                            # Environment variables**Why include `.vscode/extensions.json`?**

```

Other templates indirectly recommend extensions via the README, but this file allows VS Code to prompt the user to install the recommended extension upon opening the project.

## 🎯 Components

**Why enable `allowJs` in the TS template?**

### 📄 DocumentManager.svelte

While `allowJs: false` would indeed prevent the use of `.js` files in the project, it does not prevent the use of JavaScript syntax in `.svelte` files. In addition, it would force `checkJs: false`, bringing the worst of both worlds: not being able to guarantee the entire codebase is TypeScript, and also having worse typechecking for the existing JavaScript. In addition, there are valid use cases in which a mixed codebase may be relevant.

Component สำหรับจัดการเอกสาร:

**Why is HMR not preserving my local component state?**

**Features:**

- ✅ Drag & drop file uploadHMR state preservation comes with a number of gotchas! It has been disabled by default in both `svelte-hmr` and `@sveltejs/vite-plugin-svelte` due to its often surprising behavior. You can read the details [here](https://github.com/rixo/svelte-hmr#svelte-hmr).

- ✅ File selection dialog

- ✅ รายการเอกสารทั้งหมดIf you have state that's important to retain within a component, consider creating an external store which would not be replaced by HMR.

- ✅ แสดงข้อมูล metadata (ชื่อ, ขนาด, วันที่)

- ✅ ลบเอกสาร (พร้อม confirmation)```ts

- ✅ Status messages (success/error)// store.ts

- ✅ Loading states// An extremely simple external store

import { writable } from 'svelte/store'

**API Calls:**export default writable(0)

`typescript`

// GET documents
GET /api/documents

// Upload document
POST /api/documents
Content-Type: multipart/form-data

// Delete document
DELETE /api/documents/:id

````

### 💬 ChatInterface.svelte

Component สำหรับแชท:

**Features:**
- ✅ Message history (user + assistant)
- ✅ Input field พร้อม Enter to send
- ✅ Loading indicator
- ✅ Auto-scroll to bottom
- ✅ Error handling
- ✅ Empty state message

**API Calls:**
```typescript
// Send question
POST /api/chat
Body: { question: string }
Response: { answer: string }
````

## 🏃 วิธีรัน Local

### ติดตั้ง Dependencies

```bash
cd frontend
bun install
```

### ตั้งค่า Environment Variables

สร้างไฟล์ `.env`:

```env
VITE_API_URL=http://localhost:3000
```

### เริ่มต้น Dev Server

```bash
bun run dev
```

Frontend จะรันที่ `http://localhost:5173`

### Build สำหรับ Production

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```

## 🎨 Styling

ใช้ CSS แบบ scoped ใน Svelte components:

### Design System

**Colors:**

- Primary: `#646cff` (Svelte purple)
- Success: `#4ade80` (green)
- Error: `#f87171` (red)
- Background: `#1a1a1a` (dark)
- Text: `rgba(255, 255, 255, 0.87)`

**Spacing:**

- Grid gap: `2rem`
- Padding: `1rem`, `1.5rem`, `2rem`
- Border radius: `8px`, `12px`

**Animations:**

- Fade in: `opacity 0.3s`
- Slide up: `transform 0.3s`
- Loading spinner: `rotate 1s linear infinite`

## 🔧 Svelte 5 Runes

ใช้ Runes สำหรับ state management:

```typescript
// Reactive state
let messages = $state<Message[]>([]);

// Computed values
let hasMessages = $derived(messages.length > 0);

// Effects
$effect(() => {
  if (messages.length > 0) {
    scrollToBottom();
  }
});
```

## 📡 API Integration

### API Base URL

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
```

### Error Handling

```typescript
try {
  const response = await fetch(`${API_BASE}/api/endpoint`);
  if (!response.ok) throw new Error("API Error");
  const data = await response.json();
  // handle success
} catch (error) {
  console.error("Error:", error);
  // show error message
}
```

## 🎯 User Experience Features

### Document Upload

- **Drag & Drop**: ลากไฟล์มาวางได้
- **Visual Feedback**: เปลี่ยนสีเมื่อ hover
- **File Validation**: รองรับ PDF และ TXT
- **Progress**: แสดง uploading state
- **Success/Error**: แสดงข้อความชัดเจน

### Chat Interface

- **Real-time**: ส่งและรับข้อความทันที
- **Loading State**: แสดง "กำลังคิด..." ขณะรอ
- **Auto-scroll**: เลื่อนลงล่างสุดอัตโนมัติ
- **Enter to Send**: กด Enter เพื่อส่งข้อความ
- **Empty State**: แสดงข้อความเมื่อยังไม่มีการสนทนา

### Responsive Design

- **Grid Layout**: 2 columns บน desktop
- **Mobile Friendly**: Stack เป็น 1 column บนมือถือ
- **Max Width**: จำกัดความกว้างเพื่อ readability

## 🎨 Component Props & Events

### DocumentManager

**State:**

```typescript
documents: Document[] = [];
isDragging: boolean = false;
uploading: boolean = false;
statusMessage: { type: 'success' | 'error', text: string } | null;
```

### ChatInterface

**State:**

```typescript
messages: Message[] = [];
inputValue: string = '';
isLoading: boolean = false;
```

**Types:**

```typescript
interface Message {
  type: "user" | "assistant" | "loading";
  content: string;
}
```

## 📦 Dependencies

### Production

```json
{
  "svelte": "^5.43.3"
}
```

### Development

```json
{
  "@sveltejs/vite-plugin-svelte": "^5.0.4",
  "vite": "^7.2.1",
  "typescript": "^5.9.3",
  "tslib": "^2.8.1"
}
```

## 🐛 Common Issues

### Error: VITE_API_URL not defined

**แก้ไข**: สร้างไฟล์ `.env` และใส่ `VITE_API_URL`

### Error: API connection refused

**แก้ไข**: ตรวจสอบว่า backend รันอยู่ที่ port 3000

### Error: CORS error

**แก้ไข**: Backend มี `@elysiajs/cors` plugin แล้ว

## 🚀 Development Tips

### Hot Reload

Vite รองรับ HMR (Hot Module Replacement) โดยอัตโนมัติ

### Type Safety

ใช้ TypeScript เพื่อ type checking:

```bash
bun run check
```

## 📱 Mobile Responsive

```css
/* Desktop: 2 columns */
@media (min-width: 768px) {
  .container {
    grid-template-columns: 1fr 1fr;
  }
}

/* Mobile: 1 column */
@media (max-width: 767px) {
  .container {
    grid-template-columns: 1fr;
  }
}
```

## 🎯 Future Enhancements

- [ ] Markdown rendering ในคำตอบ
- [ ] Code syntax highlighting
- [ ] Export chat history
- [ ] Multiple file upload
- [ ] Document preview
- [ ] Dark/Light theme toggle
- [ ] Voice input

## 📚 Learn More

- [Svelte 5 Docs](https://svelte-5-preview.vercel.app/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
