<script lang="ts">
  import { onMount } from 'svelte';

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  interface Document {
    id: string;
    filename: string;
    uploadedAt: string;
    size: number;
    chunkCount: number;
  }

  let documents: Document[] = $state([]);
  let selectedFile: File | null = $state(null);
  let uploading = $state(false);
  let statusMessage = $state('');
  let statusType: 'success' | 'error' | '' = $state('');
  let isDragging = $state(false);

  onMount(() => {
    loadDocuments();
  });

  async function loadDocuments() {
    try {
      const response = await fetch(`${API_BASE}/api/documents`);
      documents = await response.json();
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      selectedFile = input.files[0];
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      selectedFile = event.dataTransfer.files[0];
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  async function uploadDocument() {
    if (!selectedFile || uploading) return;

    uploading = true;
    showStatus('กำลังอัพโหลดและประมวลผล...', '');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        showStatus(`✅ อัพโหลดสำเร็จ: ${result.document.filename}`, 'success');
        selectedFile = null;
        await loadDocuments();
      } else {
        showStatus(`❌ เกิดข้อผิดพลาด: ${result.error}`, 'error');
      }
    } catch (error: any) {
      showStatus(`❌ เกิดข้อผิดพลาด: ${error.message}`, 'error');
    } finally {
      uploading = false;
    }
  }

  async function deleteDocument(id: string) {
    if (!confirm('คุณแน่ใจที่จะลบเอกสารนี้?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/documents/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        showStatus('✅ ลบเอกสารสำเร็จ', 'success');
        await loadDocuments();
      } else {
        showStatus(`❌ เกิดข้อผิดพลาด: ${result.error}`, 'error');
      }
    } catch (error: any) {
      showStatus(`❌ เกิดข้อผิดพลาด: ${error.message}`, 'error');
    }
  }

  function showStatus(message: string, type: 'success' | 'error' | '') {
    statusMessage = message;
    statusType = type;
    setTimeout(() => {
      statusMessage = '';
      statusType = '';
    }, 5000);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="document-manager">
  <h1>📚 จัดการเอกสาร</h1>
  
  <div class="upload-section">
    <h2>อัพโหลดเอกสาร</h2>
    <div 
      class="upload-area" 
      class:dragging={isDragging}
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      onclick={() => document.getElementById('fileInput')?.click()}
    >
      {#if selectedFile}
        <p>📄 {selectedFile.name}</p>
      {:else}
        <p>🔽 ลากไฟล์มาวางที่นี่</p>
        <p class="hint">หรือคลิกเพื่อเลือกไฟล์</p>
      {/if}
      <input 
        type="file" 
        id="fileInput" 
        accept=".txt,.md,.pdf"
        onchange={handleFileSelect}
        style="display: none;"
      />
      <button 
        class="upload-btn" 
        disabled={!selectedFile || uploading}
        onclick={uploadDocument}
      >
        {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลด'}
      </button>
    </div>
    
    {#if statusMessage}
      <div class="status-message {statusType}">
        {statusMessage}
      </div>
    {/if}
  </div>

  <h2>เอกสารในระบบ</h2>
  <div class="documents-list">
    {#if documents.length === 0}
      <div class="empty-state">ยังไม่มีเอกสาร</div>
    {:else}
      {#each documents as doc}
        <div class="document-item">
          <div class="document-info">
            <div class="document-name">📄 {doc.filename}</div>
            <div class="document-meta">
              {formatFileSize(doc.size)} • {doc.chunkCount} chunks • {formatDate(doc.uploadedAt)}
            </div>
          </div>
          <button class="delete-btn" onclick={() => deleteDocument(doc.id)}>
            ลบ
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .document-manager {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  h1 {
    color: #667eea;
    margin-bottom: 20px;
    font-size: 24px;
  }

  h2 {
    color: #333;
    margin-bottom: 15px;
    font-size: 18px;
    border-bottom: 2px solid #667eea;
    padding-bottom: 10px;
  }

  .upload-section {
    margin-bottom: 25px;
  }

  .upload-area {
    border: 2px dashed #667eea;
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: #f8f9ff;
  }

  .upload-area:hover {
    background: #eef1ff;
    border-color: #764ba2;
  }

  .upload-area.dragging {
    background: #e0e7ff;
    border-color: #5145cd;
  }

  .hint {
    font-size: 12px;
    color: #666;
    margin-top: 10px;
  }

  .upload-btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    margin-top: 10px;
    transition: background 0.3s;
  }

  .upload-btn:hover:not(:disabled) {
    background: #764ba2;
  }

  .upload-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .status-message {
    padding: 10px 15px;
    border-radius: 8px;
    margin-top: 15px;
    animation: slideIn 0.3s;
  }

  .status-message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .status-message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .documents-list {
    flex: 1;
    overflow-y: auto;
  }

  .empty-state {
    text-align: center;
    color: #999;
    padding: 40px 20px;
  }

  .document-item {
    background: #f8f9ff;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: transform 0.2s;
  }

  .document-item:hover {
    transform: translateX(5px);
  }

  .document-info {
    flex: 1;
  }

  .document-name {
    font-weight: bold;
    color: #333;
    margin-bottom: 5px;
  }

  .document-meta {
    font-size: 12px;
    color: #666;
  }

  .delete-btn {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.3s;
  }

  .delete-btn:hover {
    background: #c0392b;
  }

  /* Scrollbar */
  .documents-list::-webkit-scrollbar {
    width: 8px;
  }

  .documents-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .documents-list::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 10px;
  }

  .documents-list::-webkit-scrollbar-thumb:hover {
    background: #764ba2;
  }
</style>
