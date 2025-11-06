<script lang="ts">
  import { onMount } from 'svelte';

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  interface Message {
    type: 'user' | 'assistant' | 'loading';
    content: string;
  }

  let messages: Message[] = $state([]);
  let inputValue = $state('');
  let isProcessing = $state(false);
  let messagesContainer: HTMLDivElement;

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  async function sendMessage() {
    const question = inputValue.trim();
    if (!question || isProcessing) return;

    isProcessing = true;
    inputValue = '';

    // Add user message
    messages = [...messages, { type: 'user', content: question }];
    scrollToBottom();

    // Add loading message
    messages = [...messages, { type: 'loading', content: 'กำลังค้นหาคำตอบ...' }];
    scrollToBottom();

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question })
      });

      const result = await response.json();

      // Remove loading message
      messages = messages.filter(m => m.type !== 'loading');

      if (result.answer) {
        messages = [...messages, { type: 'assistant', content: result.answer }];
      } else {
        messages = [...messages, { 
          type: 'assistant', 
          content: '❌ ไม่สามารถหาคำตอบได้ กรุณาลองใหม่อีกครั้ง' 
        }];
      }
    } catch (error: any) {
      // Remove loading message
      messages = messages.filter(m => m.type !== 'loading');
      messages = [...messages, { 
        type: 'assistant', 
        content: `❌ เกิดข้อผิดพลาด: ${error.message}` 
      }];
    } finally {
      isProcessing = false;
      scrollToBottom();
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="chat-interface">
  <h1>💬 ถามคำถาม</h1>
  
  <div class="chat-container">
    <div class="chat-messages" bind:this={messagesContainer}>
      {#if messages.length === 0}
        <div class="empty-state">
          เริ่มถามคำถามเกี่ยวกับเอกสารของคุณได้เลย!
        </div>
      {:else}
        {#each messages as message}
          <div class="message {message.type}">
            {#if message.type === 'loading'}
              <span>{message.content}</span>
              <span class="spinner"></span>
            {:else}
              {@html message.content.replace(/\n/g, '<br>')}
            {/if}
          </div>
        {/each}
      {/if}
    </div>
    
    <div class="chat-input-area">
      <input 
        type="text" 
        class="chat-input" 
        bind:value={inputValue}
        onkeypress={handleKeyPress}
        placeholder="พิมพ์คำถามของคุณที่นี่..."
        disabled={isProcessing}
      />
      <button 
        class="send-btn" 
        onclick={sendMessage}
        disabled={!inputValue.trim() || isProcessing}
      >
        ส่ง
      </button>
    </div>
  </div>
</div>

<style>
  .chat-interface {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  h1 {
    color: #667eea;
    margin-bottom: 20px;
    font-size: 24px;
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    background: #f8f9ff;
    border-radius: 10px;
    margin-bottom: 15px;
  }

  .empty-state {
    text-align: center;
    color: #999;
    padding: 40px 20px;
  }

  .message {
    margin-bottom: 15px;
    padding: 12px 15px;
    border-radius: 10px;
    max-width: 80%;
    animation: fadeIn 0.3s;
    word-wrap: break-word;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message.user {
    background: #667eea;
    color: white;
    margin-left: auto;
  }

  .message.assistant {
    background: white;
    color: #333;
    border: 1px solid #e0e0e0;
  }

  .message.loading {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .spinner {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .chat-input-area {
    display: flex;
    gap: 10px;
  }

  .chat-input {
    flex: 1;
    padding: 12px 15px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 14px;
    transition: border-color 0.3s;
    font-family: inherit;
  }

  .chat-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .chat-input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .send-btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: background 0.3s;
  }

  .send-btn:hover:not(:disabled) {
    background: #764ba2;
  }

  .send-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  /* Scrollbar */
  .chat-messages::-webkit-scrollbar {
    width: 8px;
  }

  .chat-messages::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .chat-messages::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 10px;
  }

  .chat-messages::-webkit-scrollbar-thumb:hover {
    background: #764ba2;
  }
</style>
