# 🤝 Contributing Guide

ขอบคุณที่สนใจจะมีส่วนร่วมใน RAG Web Application!

## 📋 วิธีการมีส่วนร่วม

### 1. Fork และ Clone

```bash
# Fork repository บน GitHub
# จากนั้น clone มาที่เครื่องของคุณ
git clone https://github.com/YOUR_USERNAME/bun-rag-starter.git
cd bun-rag-starter
```

### 2. สร้าง Branch ใหม่

```bash
git checkout -b feature/your-feature-name
# หรือ
git checkout -b fix/bug-description
```

### 3. ตั้งค่า Development Environment

```bash
# Copy .env
cp .env.example .env

# ติดตั้ง dependencies
cd backend && bun install
cd ../frontend && bun install
```

### 4. เริ่มพัฒนา

```bash
# เริ่ม services
docker-compose up

# หรือรัน local
cd backend && bun run api-server.ts
cd frontend && bun run dev
```

### 5. Test การเปลี่ยนแปลง

- ทดสอบ feature/fix ที่คุณทำ
- ตรวจสอบว่าไม่มี error ใน console
- ทดสอบกับ browser ต่างๆ ถ้าเป็น UI

### 6. Commit และ Push

```bash
git add .
git commit -m "feat: add your feature description"
# หรือ
git commit -m "fix: fix bug description"

git push origin feature/your-feature-name
```

### 7. สร้าง Pull Request

- ไปที่ repository บน GitHub
- คลิก "New Pull Request"
- อธิบายการเปลี่ยนแปลงของคุณ
- รอการ review

## 📝 Commit Message Convention

เราใช้ [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

**Types:**

- `feat`: Feature ใหม่
- `fix`: แก้ bug
- `docs`: เปลี่ยนแปลง documentation
- `style`: เปลี่ยนแปลง styling (ไม่กระทบ logic)
- `refactor`: Refactor code
- `perf`: ปรับปรุง performance
- `test`: เพิ่ม/แก้ tests
- `chore`: งานอื่นๆ (dependencies, config)

**ตัวอย่าง:**

```bash
feat: add markdown rendering in chat
fix: resolve CORS issue with API
docs: update README installation steps
refactor: extract LLM prompt to separate file
```

## 🎯 Areas to Contribute

### 🐛 Bug Fixes

- รายงาน bugs ผ่าน GitHub Issues
- แก้ bugs ที่มีอยู่แล้ว

### ✨ New Features

- Document management improvements
- Chat interface enhancements
- RAG pipeline optimizations
- UI/UX improvements

### 📚 Documentation

- ปรับปรุง README
- เพิ่ม code comments
- สร้าง tutorials/guides

### 🧪 Testing

- เพิ่ม unit tests
- Integration tests
- E2E tests

### 🎨 Design

- UI improvements
- Mobile responsiveness
- Accessibility

## 🔧 Development Guidelines

### Code Style

**TypeScript/JavaScript:**

- ใช้ TypeScript เสมอเมื่อเป็นไปได้
- ใช้ `const` แทน `let` เมื่อเป็นไปได้
- ใช้ arrow functions
- เพิ่ม type annotations

```typescript
// ✅ Good
const API_BASE = "http://localhost:3000";
const fetchDocuments = async (): Promise<Document[]> => {
  // ...
};

// ❌ Avoid
var api = "http://localhost:3000";
function fetchDocuments() {
  // ...
}
```

**Svelte:**

- ใช้ Svelte 5 runes (`$state`, `$derived`, `$effect`)
- แยก logic ที่ซับซ้อนเป็น functions
- ใช้ scoped CSS

```svelte
<script lang="ts">
  // ✅ Good
  let count = $state(0);
  const double = $derived(count * 2);
</script>
```

### File Organization

```
backend/
  ├── api-server.ts       # API endpoints only
  ├── rag-functions.ts    # RAG logic
  ├── graph-builder.ts    # Graph operations
  └── redis-client.ts     # Database connection

frontend/
  ├── src/
  │   ├── App.svelte         # Main layout
  │   └── lib/
  │       ├── ComponentName.svelte  # Components
  │       └── utils.ts              # Utilities
```

### Error Handling

**Backend:**

```typescript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  console.error("Operation failed:", error);
  return { error: "Error message" };
}
```

**Frontend:**

```typescript
try {
  const response = await fetch(API_BASE + "/endpoint");
  if (!response.ok) throw new Error("API Error");
  const data = await response.json();
  // handle success
} catch (error) {
  console.error("Error:", error);
  statusMessage = { type: "error", text: "เกิดข้อผิดพลาด" };
}
```

## 🚫 Pull Request Checklist

ก่อนส่ง PR ตรวจสอบว่า:

- [ ] Code ทำงานถูกต้องตามที่ตั้งใจ
- [ ] ไม่มี TypeScript errors
- [ ] ไม่มี console errors ที่ไม่จำเป็น
- [ ] Code มี comments อธิบายส่วนที่ซับซ้อน
- [ ] README อัพเดต (ถ้ามีการเปลี่ยนแปลง API/features)
- [ ] Commit messages ตาม convention
- [ ] Branch ชื่อชัดเจน (`feature/`, `fix/`, etc.)

## 🐛 Bug Report Template

เมื่อรายงาน bug ใน GitHub Issues:

```markdown
## Bug Description

อธิบาย bug ที่พบ

## Steps to Reproduce

1. ทำ...
2. คลิก...
3. เห็น error...

## Expected Behavior

ควรทำงานอย่างไร

## Actual Behavior

ทำงานอย่างไรจริงๆ

## Environment

- OS: [e.g. Ubuntu 22.04]
- Browser: [e.g. Chrome 120]
- Docker version: [e.g. 24.0.5]

## Screenshots

(ถ้ามี)

## Additional Context

ข้อมูลเพิ่มเติม
```

## 💡 Feature Request Template

```markdown
## Feature Description

อธิบาย feature ที่อยากให้เพิ่ม

## Use Case

ใช้งานในสถานการณ์ไหน

## Proposed Solution

แนวทางที่คิดว่าน่าจะทำได้

## Alternatives

ทางเลือกอื่นๆ ที่พิจารณาแล้ว

## Additional Context

ข้อมูลเพิ่มเติม
```

## 📞 ติดต่อ

- GitHub Issues: สำหรับ bugs และ feature requests
- Pull Requests: สำหรับ code contributions
- Discussions: สำหรับคำถามและการสนทนา

## 📜 Code of Conduct

- เคารพผู้อื่น
- ใช้ภาษาที่เหมาะสม
- รับฟังความคิดเห็น
- ช่วยเหลือผู้อื่น

## 🎉 ขอบคุณ

ขอบคุณทุกท่านที่มีส่วนร่วมพัฒนาโปรเจคนี้!
