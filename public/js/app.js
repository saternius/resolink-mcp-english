/**
 * ResoLink Browser - Main Application
 * Entry point and state management
 */

class App {
  constructor() {
    this.client = null;
    this.selectedSlotId = null;
    this.selectedSlot = null;
    this.sceneRootId = null;  // Scene slot ID (tree root)

    // UI References
    this.elements = {
      wsUrl: document.getElementById('ws-url'),
      connectBtn: document.getElementById('connect-btn'),
      connectionStatus: document.getElementById('connection-status'),
      slotTree: document.getElementById('slot-tree'),
      inspector: document.getElementById('inspector'),
      refreshTreeBtn: document.getElementById('refresh-tree-btn'),
      addSlotBtn: document.getElementById('add-slot-btn'),
      consoleOutput: document.getElementById('console-output'),
      clearConsoleBtn: document.getElementById('clear-console-btn'),
      toggleConsoleBtn: document.getElementById('toggle-console-btn'),
      consolePanel: document.getElementById('console-panel'),
    };

    // Initialize modules
    this.console = new ConsolePanel(this.elements.consoleOutput);
    window.scriptConsole = this.console;

    this.init();
  }

  init() {
    this.bindEvents();
    this.initTabs();
    this.initModals();
    this.initContextMenu();
    this.console.log('ResoLink Browser initialized');
  }

  bindEvents() {
    // Connection
    this.elements.connectBtn.addEventListener('click', () => this.toggleConnection());

    // Tree actions
    this.elements.refreshTreeBtn.addEventListener('click', () => this.refreshTree());
    this.elements.addSlotBtn.addEventListener('click', () => this.showModal('add-slot-modal'));

    // Console
    this.elements.clearConsoleBtn.addEventListener('click', () => this.console.clear());
    this.elements.toggleConsoleBtn.addEventListener('click', () => this.toggleConsole());

    // Add slot modal
    document.getElementById('confirm-add-slot').addEventListener('click', () => this.addSlot());

    // New script modal
    document.getElementById('new-script-btn')?.addEventListener('click', () => this.showModal('new-script-modal'));
    document.getElementById('confirm-new-script')?.addEventListener('click', () => this.createNewScript());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update tab buttons
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update tab panes
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // Initialize Monaco when scripts tab is shown
        if (tabId === 'scripts' && window.scriptEditor) {
          window.scriptEditor.initMonaco();
        }
      });
    });
  }

  initModals() {
    // Close modal buttons
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.dataset.modal || btn.closest('.modal').id;
        this.hideModal(modalId);
      });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal(modal.id);
        }
      });
    });
  }

  initContextMenu() {
    const contextMenu = document.getElementById('context-menu');

    // Hide on click outside
    document.addEventListener('click', () => {
      contextMenu.classList.remove('visible');
    });

    // Handle context menu actions
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        this.handleContextMenuAction(action);
        contextMenu.classList.remove('visible');
      });
    });
  }

  showContextMenu(x, y, slotId) {
    this.contextMenuSlotId = slotId;
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.classList.add('visible');
  }

  handleContextMenuAction(action) {
    if (!this.contextMenuSlotId) return;

    switch (action) {
      case 'add-child':
        this.selectedSlotId = this.contextMenuSlotId;
        this.showModal('add-slot-modal');
        break;
      case 'add-component':
        this.console.log(`Add component to ${this.contextMenuSlotId}`);
        // TODO: Show component picker
        break;
      case 'duplicate':
        this.duplicateSlot(this.contextMenuSlotId);
        break;
      case 'rename':
        this.console.log(`Rename ${this.contextMenuSlotId}`);
        // TODO: Inline rename
        break;
      case 'delete':
        this.deleteSlot(this.contextMenuSlotId);
        break;
    }
  }

  showModal(modalId) {
    document.getElementById(modalId).classList.add('visible');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.remove('visible');
  }

  handleKeyDown(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.visible').forEach(modal => {
        this.hideModal(modal.id);
      });
    }

    // Ctrl+S to save script
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (window.scriptEditor?.currentScript) {
        window.scriptEditor.saveScript();
      }
    }
  }

  toggleConsole() {
    this.elements.consolePanel.classList.toggle('collapsed');
    const icon = this.elements.toggleConsoleBtn.querySelector('svg');
    if (this.elements.consolePanel.classList.contains('collapsed')) {
      icon.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
    } else {
      icon.innerHTML = '<polyline points="18 15 12 9 6 15"/>';
    }
  }

  // ============================================
  // Connection Management
  // ============================================

  async toggleConnection() {
    if (this.client?.connected) {
      this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    const url = this.elements.wsUrl.value;

    this.client = new ResoniteClient({
      url,
      debug: true,
      requestTimeout: 30000,
    });

    // Bind events
    this.client.on('connected', () => {
      this.console.log('Connected to ResoniteLink');
      this.updateConnectionStatus(true);
      this.refreshTree();
    });

    this.client.on('disconnected', ({ code, reason }) => {
      this.console.warn(`Disconnected: ${code} ${reason || ''}`);
      this.updateConnectionStatus(false);
      this.clearTree();
    });

    this.client.on('error', (error) => {
      this.console.error('Connection error:', error);
    });

    try {
      this.updateConnectionStatus('connecting');
      await this.client.connect();
    } catch (error) {
      this.console.error('Failed to connect:', error.message);
      this.updateConnectionStatus(false);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    this.updateConnectionStatus(false);
    this.clearTree();
  }

  updateConnectionStatus(status) {
    const el = this.elements.connectionStatus;
    const btn = this.elements.connectBtn;

    el.classList.remove('connected', 'disconnected', 'connecting');

    if (status === true) {
      el.textContent = 'Connected';
      el.classList.add('connected');
      btn.textContent = 'Disconnect';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger');
    } else if (status === 'connecting') {
      el.textContent = 'Connecting...';
      el.classList.add('connecting');
      btn.textContent = 'Cancel';
    } else {
      el.textContent = 'Disconnected';
      el.classList.add('disconnected');
      btn.textContent = 'Connect';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-primary');
    }
  }

  // ============================================
  // Tree Management
  // ============================================

  async refreshTree() {
    if (!this.client?.connected) {
      this.console.warn('Not connected');
      return;
    }

    try {
      // Find the Scene slot to use as tree root
      const sceneSlot = await this.client.findSceneSlot();

      if (sceneSlot) {
        this.sceneRootId = sceneSlot.id;
        // Get Scene with depth 2 for initial tree
        const response = await this.client.getSlot({
          slotId: sceneSlot.id,
          depth: 2,
          includeComponentData: false,
        });
        if (response.success) {
          window.slotTree.render(response.data);
        } else {
          this.console.error('Failed to get scene slot:', response.errorInfo);
        }
      } else {
        // Fallback to root if no Scene slot found
        this.console.warn('Scene slot not found, showing root');
        this.sceneRootId = ROOT_SLOT_ID;
        const response = await this.client.getRootSlot(2);
        if (response.success) {
          window.slotTree.render(response.data);
        } else {
          this.console.error('Failed to get root slot:', response.errorInfo);
        }
      }
    } catch (error) {
      this.console.error('Error refreshing tree:', error.message);
    }
  }

  clearTree() {
    this.elements.slotTree.innerHTML = '<div class="tree-placeholder">Connect to view scene tree</div>';
    this.selectedSlotId = null;
    this.selectedSlot = null;
    this.sceneRootId = null;
    this.clearInspector();
  }

  // ============================================
  // Slot Operations
  // ============================================

  async selectSlot(slotId) {
    if (!this.client?.connected) return;

    this.selectedSlotId = slotId;

    try {
      const response = await this.client.getSlot({
        slotId,
        depth: 0,
        includeComponentData: true,
      });

      if (response.success) {
        this.selectedSlot = response.data;
        window.componentEditor.render(response.data);
      } else {
        this.console.error('Failed to get slot:', response.errorInfo);
      }
    } catch (error) {
      this.console.error('Error selecting slot:', error.message);
    }
  }

  async expandSlot(slotId) {
    if (!this.client?.connected) return null;

    try {
      const response = await this.client.getSlot({
        slotId,
        depth: 1,
        includeComponentData: false,
      });

      if (response.success) {
        return response.data.children || [];
      }
    } catch (error) {
      this.console.error('Error expanding slot:', error.message);
    }
    return [];
  }

  async addSlot() {
    if (!this.client?.connected) {
      this.console.warn('Not connected');
      return;
    }

    const name = document.getElementById('new-slot-name').value || 'NewSlot';
    const x = parseFloat(document.getElementById('new-slot-x').value) || 0;
    const y = parseFloat(document.getElementById('new-slot-y').value) || 0;
    const z = parseFloat(document.getElementById('new-slot-z').value) || 0;

    try {
      const response = await this.client.addSlot({
        parentId: this.selectedSlotId || this.sceneRootId || ROOT_SLOT_ID,
        name,
        position: { x, y, z },
        isActive: true,
      });

      if (response.success) {
        this.console.log(`Created slot: ${name}`);
        this.hideModal('add-slot-modal');
        this.refreshTree();
      } else {
        this.console.error('Failed to create slot:', response.errorInfo);
      }
    } catch (error) {
      this.console.error('Error creating slot:', error.message);
    }
  }

  async deleteSlot(slotId) {
    if (!this.client?.connected) return;

    // Safety check for system slots
    const systemSlots = ['Root', 'Controllers', 'Roles', 'SpawnArea', 'Light', 'Skybox', 'Assets'];
    if (systemSlots.includes(slotId)) {
      this.console.error('Cannot delete system slot');
      return;
    }

    if (!confirm('Are you sure you want to delete this slot?')) return;

    try {
      const response = await this.client.removeSlot(slotId);
      if (response.success) {
        this.console.log('Slot deleted');
        if (this.selectedSlotId === slotId) {
          this.selectedSlotId = null;
          this.clearInspector();
        }
        this.refreshTree();
      } else {
        this.console.error('Failed to delete slot:', response.errorInfo);
      }
    } catch (error) {
      this.console.error('Error deleting slot:', error.message);
    }
  }

  async duplicateSlot(slotId) {
    this.console.log('Duplicate not yet implemented via API');
    // TODO: Implement via recursive slot copy or MCP tool
  }

  // ============================================
  // Inspector
  // ============================================

  clearInspector() {
    this.elements.inspector.innerHTML = `
      <div class="inspector-placeholder">
        <p>Select a slot to inspect</p>
      </div>
    `;
  }

  // ============================================
  // Script Management
  // ============================================

  async createNewScript() {
    const name = document.getElementById('script-name-input').value || 'NewScript';
    const template = document.getElementById('script-template').value;

    if (window.scriptManager) {
      await window.scriptManager.createScript(name, template);
      this.hideModal('new-script-modal');
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
