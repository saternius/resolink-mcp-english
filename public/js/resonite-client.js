/**
 * ResoniteClient - Browser WebSocket client for ResoniteLink
 * Direct connection from browser to ws://localhost:29551
 */

const ROOT_SLOT_ID = 'Root';
const SCENE_SLOT_NAME = 'Scene';

class ResoniteClient {
  constructor(options = {}) {
    this.url = options.url || 'ws://localhost:29551';
    this.debug = options.debug || false;
    this.requestTimeout = options.requestTimeout || 30000;

    this.ws = null;
    this.isConnected = false;
    this.pendingRequests = new Map();
    this.eventListeners = new Map();
  }

  // ============================================
  // Event System
  // ============================================

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      for (const callback of this.eventListeners.get(event)) {
        try {
          callback(data);
        } catch (e) {
          console.error(`Event handler error for ${event}:`, e);
        }
      }
    }
  }

  // ============================================
  // Connection Management
  // ============================================

  get connected() {
    return this.isConnected;
  }

  async connect(url) {
    if (url) this.url = url;

    this.log(`Connecting to ${this.url}`);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (error) {
        reject(new Error(`Failed to create WebSocket: ${error.message}`));
        return;
      }

      this.ws.onopen = () => {
        this.isConnected = true;
        this.log('Connected successfully');
        this.emit('connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        this.log(`Connection closed: ${event.code} ${event.reason}`);
        this.isConnected = false;
        this.rejectAllPending(new Error('Connection closed'));
        this.emit('disconnected', { code: event.code, reason: event.reason });
      };

      this.ws.onerror = (error) => {
        this.logError('WebSocket error', error);
        if (!this.isConnected) {
          reject(new Error('WebSocket connection failed'));
        }
        this.emit('error', error);
      };
    });
  }

  disconnect() {
    this.log('Disconnecting');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  // ============================================
  // Message Handling
  // ============================================

  handleMessage(data) {
    try {
      const response = JSON.parse(data);
      const pending = this.pendingRequests.get(response.sourceMessageId);

      this.log('RECV', {
        success: response.success,
        messageId: response.sourceMessageId,
        error: response.errorInfo
      });

      if (!response.success && response.errorInfo) {
        this.logError(`Response error for ${response.sourceMessageId}`, response.errorInfo);
      }

      if (pending) {
        this.pendingRequests.delete(response.sourceMessageId);
        pending.resolve(response);
      }
    } catch (error) {
      this.logError('Failed to parse message', error);
    }
  }

  rejectAllPending(error) {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  async sendMessage(message) {
    if (!this.ws || !this.isConnected) {
      this.logError('Send failed - not connected', message.$type);
      throw new Error('Not connected');
    }

    // Log the message being sent
    this.log('SEND', {
      $type: message.$type,
      messageId: message.messageId,
      slotId: message.slotId,
      componentType: message.componentType,
      containerSlotId: message.containerSlotId,
      id: message.id
    });

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(message.messageId)) {
          this.pendingRequests.delete(message.messageId);
          const error = new Error(`Request timeout after ${this.requestTimeout}ms: ${message.$type}`);
          this.logError('Request timeout', { messageId: message.messageId, type: message.$type });
          reject(error);
        }
      }, this.requestTimeout);

      this.pendingRequests.set(message.messageId, {
        resolve: (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });

      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(message.messageId);
        reject(error);
      }
    });
  }

  // Generate UUID (browser native)
  generateId() {
    return crypto.randomUUID();
  }

  // ============================================
  // Slot API
  // ============================================

  async getSlot(options) {
    const slotId = typeof options === 'string' ? options : options.slotId;
    const depth = options.depth ?? 0;
    const includeComponentData = options.includeComponentData ?? false;

    const message = {
      $type: 'getSlot',
      messageId: this.generateId(),
      slotId,
      depth,
      includeComponentData,
    };

    return this.sendMessage(message);
  }

  async getRootSlot(depth = 0, includeComponentData = false) {
    return this.getSlot({
      slotId: ROOT_SLOT_ID,
      depth,
      includeComponentData,
    });
  }

  async addSlot(options) {
    const slotData = {};

    if (options.parentId) {
      slotData.parent = { targetId: options.parentId };
    }
    if (options.name !== undefined) {
      slotData.name = { value: options.name };
    }
    if (options.position) {
      slotData.position = { value: options.position };
    }
    if (options.rotation) {
      slotData.rotation = { value: options.rotation };
    }
    if (options.scale) {
      slotData.scale = { value: options.scale };
    }
    if (options.isActive !== undefined) {
      slotData.isActive = { value: options.isActive };
    }
    if (options.isPersistent !== undefined) {
      slotData.isPersistent = { value: options.isPersistent };
    }
    if (options.tag !== undefined) {
      slotData.tag = { value: options.tag };
    }

    const message = {
      $type: 'addSlot',
      messageId: this.generateId(),
      data: slotData,
    };

    return this.sendMessage(message);
  }

  async updateSlot(idOrOptions, propsIfId) {
    // Support both updateSlot(id, props) and updateSlot({ id, ...props })
    let id, props;
    if (typeof idOrOptions === 'string') {
      id = idOrOptions;
      props = propsIfId || {};
    } else {
      id = idOrOptions.id;
      props = idOrOptions;
    }

    const slotData = { id };

    if (props.name !== undefined) {
      slotData.name = { value: props.name };
    }
    if (props.position) {
      slotData.position = { value: props.position };
    }
    if (props.rotation) {
      slotData.rotation = { value: props.rotation };
    }
    if (props.scale) {
      slotData.scale = { value: props.scale };
    }
    if (props.isActive !== undefined) {
      slotData.isActive = { value: props.isActive };
    }
    if (props.isPersistent !== undefined) {
      slotData.isPersistent = { value: props.isPersistent };
    }
    if (props.tag !== undefined) {
      slotData.tag = { value: props.tag };
    }

    const message = {
      $type: 'updateSlot',
      messageId: this.generateId(),
      data: slotData,
    };

    return this.sendMessage(message);
  }

  async removeSlot(slotId) {
    const message = {
      $type: 'removeSlot',
      messageId: this.generateId(),
      slotId,
    };

    return this.sendMessage(message);
  }

  // ============================================
  // Component API
  // ============================================

  async getComponent(componentId) {
    const message = {
      $type: 'getComponent',
      messageId: this.generateId(),
      componentId,
    };

    return this.sendMessage(message);
  }

  async addComponent(options) {
    // Support both addComponent({ containerSlotId, componentType }) and addComponent(slotId, type)
    let containerSlotId, componentType, members;
    if (typeof options === 'string') {
      containerSlotId = options;
      componentType = arguments[1];
      members = arguments[2];
    } else {
      containerSlotId = options.containerSlotId;
      componentType = options.componentType;
      members = options.members;
    }

    const componentData = {
      componentType,
      members,
    };

    const message = {
      $type: 'addComponent',
      messageId: this.generateId(),
      containerSlotId,
      data: componentData,
    };

    return this.sendMessage(message);
  }

  async updateComponent(idOrOptions, membersIfId) {
    // Support both updateComponent(id, members) and updateComponent({ id, members })
    let id, members;
    if (typeof idOrOptions === 'string') {
      id = idOrOptions;
      members = membersIfId;
    } else {
      id = idOrOptions.id;
      members = idOrOptions.members;
    }

    const componentData = {
      id,
      members,
    };

    const message = {
      $type: 'updateComponent',
      messageId: this.generateId(),
      data: componentData,
    };

    return this.sendMessage(message);
  }

  async removeComponent(componentId) {
    const message = {
      $type: 'removeComponent',
      messageId: this.generateId(),
      componentId,
    };

    return this.sendMessage(message);
  }

  // ============================================
  // Utility Methods
  // ============================================

  async findSlotByName(name, startSlotId = ROOT_SLOT_ID, depth = -1) {
    const response = await this.getSlot({
      slotId: startSlotId,
      depth,
      includeComponentData: false,
    });

    if (!response.success) {
      return null;
    }

    return this.findSlotByNameRecursive(response.data, name);
  }

  findSlotByNameRecursive(slot, name) {
    if (slot.name?.value === name) {
      return slot;
    }

    if (slot.children) {
      for (const child of slot.children) {
        const found = this.findSlotByNameRecursive(child, name);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  async getSlotHierarchy(slotId, depth = 1) {
    const response = await this.getSlot({
      slotId,
      depth,
      includeComponentData: true,
    });

    return response.success ? response.data : null;
  }

  async getSlotChildren(slotId) {
    const response = await this.getSlot({
      slotId,
      depth: 1,
      includeComponentData: false,
    });

    return response.success ? (response.data.children || []) : [];
  }

  async listComponents(slotId) {
    const response = await this.getSlot({
      slotId,
      depth: 0,
      includeComponentData: true,
    });

    return response.success ? (response.data.components || []) : [];
  }

  /**
   * Find the Scene slot, searching from Root with specified depth
   * Returns the Scene slot data if found, null otherwise
   */
  async findSceneSlot(maxDepth = 5) {
    const response = await this.getSlot({
      slotId: ROOT_SLOT_ID,
      depth: maxDepth,
      includeComponentData: false,
    });

    if (!response.success) {
      return null;
    }

    return this.findSlotByNameRecursive(response.data, SCENE_SLOT_NAME);
  }

  // ============================================
  // Logging
  // ============================================

  log(message, data) {
    if (!this.debug) return;

    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] ${message}:`, data);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }

  logError(message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error);
  }
}

// Export for use in other modules
window.ResoniteClient = ResoniteClient;
window.ROOT_SLOT_ID = ROOT_SLOT_ID;
window.SCENE_SLOT_NAME = SCENE_SLOT_NAME;
