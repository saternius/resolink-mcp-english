/**
 * ScriptContext - API provided to user scripts
 * Provides controlled access to Resonite operations
 */

class ScriptContext {
  constructor(scriptId, scriptName, targetSlotId, client) {
    this.scriptId = scriptId;
    this.scriptName = scriptName;
    this.targetSlotId = targetSlotId;
    this._client = client;

    // User state - persisted across update calls
    this.vars = {};

    // Time values - updated each frame
    this.time = 0;
    this.deltaTime = 0;
    this.frameCount = 0;

    // Bind all API methods to this context
    this._bindMethods();
  }

  _bindMethods() {
    // Ensure all nested object methods are bound
    Object.keys(this.slot).forEach(key => {
      if (typeof this.slot[key] === 'function') {
        this.slot[key] = this.slot[key].bind(this);
      }
    });
    Object.keys(this.component).forEach(key => {
      if (typeof this.component[key] === 'function') {
        this.component[key] = this.component[key].bind(this);
      }
    });
  }

  // ============================================
  // Slot API
  // ============================================

  slot = {
    /**
     * Get slot data by ID (or target slot if no ID provided)
     */
    get: async (slotId, options = {}) => {
      const id = slotId || this.targetSlotId;
      const response = await this._client.getSlot({
        slotId: id,
        depth: options.depth ?? 0,
        includeComponentData: options.includeComponentData ?? false,
      });
      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to get slot');
      }
      return response.data;
    },

    /**
     * Get children of a slot
     */
    getChildren: async (slotId) => {
      const id = slotId || this.targetSlotId;
      return await this._client.getSlotChildren(id);
    },

    /**
     * Update target slot properties
     */
    update: async (props) => {
      const response = await this._client.updateSlot(this.targetSlotId, props);
      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to update slot');
      }
      return response;
    },

    /**
     * Update any slot by ID
     */
    updateById: async (slotId, props) => {
      const response = await this._client.updateSlot(slotId, props);
      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to update slot');
      }
      return response;
    },

    /**
     * Find slot by name
     */
    find: async (name, parentId, depth = -1) => {
      return await this._client.findSlotByName(name, parentId || ROOT_SLOT_ID, depth);
    },

    /**
     * Create a new slot
     */
    create: async (options) => {
      const response = await this._client.addSlot({
        parentId: options.parentId || this.targetSlotId,
        name: options.name,
        position: options.position,
        rotation: options.rotation,
        scale: options.scale,
        isActive: options.isActive ?? true,
      });
      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to create slot');
      }
      return response;
    },

    /**
     * Remove a slot
     */
    remove: async (slotId) => {
      const response = await this._client.removeSlot(slotId);
      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to remove slot');
      }
      return response;
    },
  };

  // ============================================
  // Component API
  // ============================================

  component = {
    /**
     * List components on a slot
     */
    list: async (slotId) => {
      const id = slotId || this.targetSlotId;
      return await this._client.listComponents(id);
    },

    /**
     * Get component by ID
     */
    get: async (componentId) => {
      const response = await this._client.getComponent(componentId);
      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to get component');
      }
      return response.data;
    },

    /**
     * Add a component to a slot
     */
    add: async (componentType, slotId) => {
      const id = slotId || this.targetSlotId;
      const response = await this._client.addComponent({
        containerSlotId: id,
        componentType,
      });
      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to add component');
      }
      return response;
    },

    /**
     * Update component members
     */
    update: async (componentId, members) => {
      const response = await this._client.updateComponent({
        id: componentId,
        members,
      });
      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to update component');
      }
      return response;
    },

    /**
     * Remove a component
     */
    remove: async (componentId) => {
      const response = await this._client.removeComponent(componentId);
      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to remove component');
      }
      return response;
    },

    /**
     * Find component by type on a slot
     */
    findByType: async (typeName, slotId) => {
      const components = await this.component.list(slotId);
      return components.find(c => c.componentType?.includes(typeName));
    },
  };

  // ============================================
  // Logging API
  // ============================================

  log(...args) {
    window.scriptConsole?.scriptLog(this.scriptName, ...args);
  }

  warn(...args) {
    window.scriptConsole?.scriptWarn(this.scriptName, ...args);
  }

  error(...args) {
    window.scriptConsole?.scriptError(this.scriptName, ...args);
  }

  // ============================================
  // Control API
  // ============================================

  /**
   * Stop this script
   */
  stop() {
    window.scriptRunner?.stop(this.scriptId);
  }

  // ============================================
  // Math Utilities
  // ============================================

  math = {
    /**
     * Create a quaternion from euler angles (degrees)
     */
    eulerToQuat: (x, y, z) => {
      const toRad = Math.PI / 180;
      const cx = Math.cos(x * toRad / 2);
      const cy = Math.cos(y * toRad / 2);
      const cz = Math.cos(z * toRad / 2);
      const sx = Math.sin(x * toRad / 2);
      const sy = Math.sin(y * toRad / 2);
      const sz = Math.sin(z * toRad / 2);

      return {
        x: sx * cy * cz - cx * sy * sz,
        y: cx * sy * cz + sx * cy * sz,
        z: cx * cy * sz - sx * sy * cz,
        w: cx * cy * cz + sx * sy * sz,
      };
    },

    /**
     * Linear interpolation
     */
    lerp: (a, b, t) => a + (b - a) * t,

    /**
     * Clamp value between min and max
     */
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

    /**
     * Create an sRGB color
     */
    color: (r, g, b, a = 1) => ({ r, g, b, a, profile: 'sRGB' }),

    /**
     * Create a color from HSV (h: 0-360, s: 0-1, v: 0-1)
     */
    hsvToColor: (h, s, v, a = 1) => {
      h = h % 360;
      const c = v * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = v - c;

      let r, g, b;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }

      return { r: r + m, g: g + m, b: b + m, a, profile: 'sRGB' };
    },
  };
}

// Make available globally
window.ScriptContext = ScriptContext;
