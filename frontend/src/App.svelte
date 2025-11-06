<script lang="ts">
  import DocumentManager from './lib/DocumentManager.svelte'
  import ChatInterface from './lib/ChatInterface.svelte'
</script>

<main>
  <div class="container">
    <div class="panel">
      <DocumentManager />
    </div>
    <div class="panel">
      <ChatInterface />
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  main {
    padding: 20px;
    min-height: 100vh;
  }

  .container {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 20px;
    height: calc(100vh - 40px);
  }

  .panel {
    background: white;
    border-radius: 15px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    padding: 25px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 1024px) {
    .container {
      grid-template-columns: 1fr;
      height: auto;
    }
    
    .panel {
      min-height: 400px;
    }
  }
</style>
