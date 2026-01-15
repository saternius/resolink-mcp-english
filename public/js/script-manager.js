/**
 * ScriptManager - Script CRUD operations
 * Scripts are stored in Resonite using ValueField<string> components
 *
 * Structure in Resonite:
 * __ResoLinkScripts/
 *   ├── {script-name}/
 *   │   ├── ValueField<string> (name: "code") → JavaScript source
 *   │   ├── ValueField<string> (name: "meta") → JSON metadata
 *   │   └── ValueField<bool>   (name: "enabled")
 */

const SCRIPTS_ROOT_NAME = '__ResoLinkScripts';

class ScriptManager {
  constructor() {
    this.scripts = new Map();
    this.scriptsRootId = null;
    this.listContainer = document.getElementById('script-list');
  }

  // ============================================
  // Script Templates
  // ============================================

  getTemplate(templateId) {
    const templates = {
      empty: `// Your script here
let onStart, onUpdate, onDestroy;

onStart = async (ctx) => {
  ctx.log('Script started');
};

onUpdate = (ctx) => {
  // Called every frame
  // ctx.time - elapsed time in seconds
  // ctx.deltaTime - time since last frame
};

onDestroy = async (ctx) => {
  ctx.log('Script stopped');
};
`,

      basic: `// Basic Script Template
let onStart, onUpdate, onDestroy;

onStart = async (ctx) => {
  ctx.log('Script started on slot:', ctx.targetSlotId);

  // Get the target slot
  const slot = await ctx.slot.get();
  ctx.log('Slot name:', slot.name?.value);
};

onUpdate = (ctx) => {
  // Called ~60 times per second
  // Use ctx.deltaTime for frame-rate independent movement
};

onDestroy = async (ctx) => {
  ctx.log('Script stopped');
};
`,

      spinning: `// Spinning Object Script
let onStart, onUpdate, onDestroy;

let rotationSpeed = 45; // degrees per second

onStart = async (ctx) => {
  ctx.log('Spinning cube started');
  ctx.vars.angle = 0;
};

onUpdate = (ctx) => {
  ctx.vars.angle += rotationSpeed * ctx.deltaTime;

  // Create rotation quaternion from Y-axis rotation
  const rad = ctx.vars.angle * Math.PI / 180;
  const rotation = {
    x: 0,
    y: Math.sin(rad / 2),
    z: 0,
    w: Math.cos(rad / 2)
  };

  ctx.slot.update({ rotation });
};

onDestroy = async (ctx) => {
  // Reset rotation
  await ctx.slot.update({
    rotation: { x: 0, y: 0, z: 0, w: 1 }
  });
  ctx.log('Spinning stopped');
};
`,

      'color-cycle': `// Color Cycling Script
let onStart, onUpdate, onDestroy;

let cycleSpeed = 60; // degrees per second (full cycle = 360)
let materialComponentId = null;

onStart = async (ctx) => {
  ctx.log('Color cycle started');

  // Find PBS_Metallic or PBS_Specular material
  const components = await ctx.component.list();
  const material = components.find(c =>
    c.componentType?.includes('PBS_Metallic') ||
    c.componentType?.includes('PBS_Specular')
  );

  if (material) {
    materialComponentId = material.id;
    ctx.log('Found material:', material.id);
  } else {
    ctx.warn('No PBS material found on slot');
  }
};

onUpdate = (ctx) => {
  if (!materialComponentId) return;

  // Cycle hue based on time
  const hue = (ctx.time * cycleSpeed) % 360;
  const color = ctx.math.hsvToColor(hue, 1, 1);

  ctx.component.update(materialComponentId, {
    AlbedoColor: { $type: 'colorX', value: color }
  });
};

onDestroy = async (ctx) => {
  // Reset to white
  if (materialComponentId) {
    await ctx.component.update(materialComponentId, {
      AlbedoColor: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1, profile: 'sRGB' } }
    });
  }
  ctx.log('Color cycle stopped');
};
`,
    };

    return templates[templateId] || templates.empty;
  }

  // ============================================
  // Script CRUD
  // ============================================

  async loadScripts() {
    if (!window.app?.client?.connected) {
      this.scripts.clear();
      this.renderScriptList();
      return;
    }

    try {
      // Find or create scripts root slot
      this.scriptsRootId = await this.ensureScriptsRoot();

      // Get all script slots
      const response = await window.app.client.getSlot({
        slotId: this.scriptsRootId,
        depth: 2,
        includeComponentData: true,
      });

      if (!response.success) {
        throw new Error(response.errorInfo || 'Failed to get scripts');
      }

      // Parse scripts from slots
      this.scripts.clear();
      const children = response.data.children || [];

      for (const child of children) {
        const script = this.parseScriptSlot(child);
        if (script) {
          this.scripts.set(script.id, script);
        }
      }

      window.scriptConsole?.log(`Loaded ${this.scripts.size} scripts`);
      this.renderScriptList();
    } catch (error) {
      window.scriptConsole?.error('Failed to load scripts:', error.message);
    }
  }

  parseScriptSlot(slot) {
    const components = slot.components || [];

    // Find ValueField<string> components
    const codeField = components.find(c =>
      c.componentType?.includes('ValueField`1[[System.String') &&
      c.members?.name?.value === 'code'
    );
    const metaField = components.find(c =>
      c.componentType?.includes('ValueField`1[[System.String') &&
      c.members?.name?.value === 'meta'
    );

    if (!codeField) return null;

    let meta = {};
    try {
      if (metaField?.members?.Value?.value) {
        meta = JSON.parse(metaField.members.Value.value);
      }
    } catch (e) {
      // Invalid meta JSON
    }

    return {
      id: slot.id,
      name: slot.name?.value || 'Unnamed Script',
      code: codeField.members?.Value?.value || '',
      codeFieldId: codeField.id,
      metaFieldId: metaField?.id,
      meta,
      targetSlotId: meta.targetSlotId,
    };
  }

  async ensureScriptsRoot() {
    const client = window.app.client;

    // Try to find existing scripts root
    const existing = await client.findSlotByName(SCRIPTS_ROOT_NAME, ROOT_SLOT_ID, 1);
    if (existing) {
      return existing.id;
    }

    // Create scripts root slot
    const response = await client.addSlot({
      parentId: ROOT_SLOT_ID,
      name: SCRIPTS_ROOT_NAME,
      isActive: true,
    });

    if (!response.success) {
      throw new Error('Failed to create scripts root');
    }

    // Find the created slot
    const created = await client.findSlotByName(SCRIPTS_ROOT_NAME, ROOT_SLOT_ID, 1);
    if (!created) {
      throw new Error('Failed to find created scripts root');
    }

    window.scriptConsole?.log('Created scripts root slot');
    return created.id;
  }

  async createScript(name, templateId = 'empty') {
    if (!window.app?.client?.connected) {
      window.scriptConsole?.error('Not connected');
      return null;
    }

    try {
      const client = window.app.client;
      const rootId = await this.ensureScriptsRoot();

      // Create script slot
      await client.addSlot({
        parentId: rootId,
        name,
        isActive: true,
      });

      // Find the created slot
      const slot = await client.findSlotByName(name, rootId, 1);
      if (!slot) {
        throw new Error('Failed to find created script slot');
      }

      // Add code ValueField
      await client.addComponent({
        containerSlotId: slot.id,
        componentType: '[FrooxEngine]FrooxEngine.ValueField`1[[System.String, mscorlib]]',
      });

      // Get the component and set name + initial code
      const slotData = await client.getSlot({
        slotId: slot.id,
        depth: 0,
        includeComponentData: true,
      });

      const codeField = slotData.data.components?.find(c =>
        c.componentType?.includes('ValueField`1[[System.String')
      );

      if (codeField) {
        await client.updateComponent({
          id: codeField.id,
          members: {
            name: { $type: 'string', value: 'code' },
            Value: { $type: 'string', value: this.getTemplate(templateId) },
          },
        });
      }

      window.scriptConsole?.log(`Created script: ${name}`);

      // Reload scripts
      await this.loadScripts();

      // Select the new script
      if (this.scripts.has(slot.id)) {
        this.selectScript(slot.id);
      }

      return slot.id;
    } catch (error) {
      window.scriptConsole?.error('Failed to create script:', error.message);
      return null;
    }
  }

  async saveScript(scriptId, code) {
    const script = this.scripts.get(scriptId);
    if (!script || !script.codeFieldId) {
      window.scriptConsole?.error('Script not found');
      return false;
    }

    try {
      await window.app.client.updateComponent({
        id: script.codeFieldId,
        members: {
          Value: { $type: 'string', value: code },
        },
      });

      // Update local cache
      script.code = code;

      window.scriptConsole?.log(`Saved script: ${script.name}`);
      return true;
    } catch (error) {
      window.scriptConsole?.error('Failed to save script:', error.message);
      return false;
    }
  }

  async deleteScript(scriptId) {
    const script = this.scripts.get(scriptId);
    if (!script) return false;

    if (!confirm(`Delete script "${script.name}"?`)) return false;

    try {
      // Stop if running
      if (window.scriptRunner?.isRunning(scriptId)) {
        await window.scriptRunner.stop(scriptId);
      }

      await window.app.client.removeSlot(scriptId);

      this.scripts.delete(scriptId);
      window.scriptConsole?.log(`Deleted script: ${script.name}`);

      this.renderScriptList();

      // Clear editor if this was selected
      if (window.scriptEditor?.currentScript?.id === scriptId) {
        window.scriptEditor.clearEditor();
      }

      return true;
    } catch (error) {
      window.scriptConsole?.error('Failed to delete script:', error.message);
      return false;
    }
  }

  // ============================================
  // UI
  // ============================================

  renderScriptList() {
    if (!this.listContainer) return;

    if (this.scripts.size === 0) {
      this.listContainer.innerHTML = '<div class="tree-placeholder">No scripts found</div>';
      return;
    }

    this.listContainer.innerHTML = '';

    for (const script of this.scripts.values()) {
      const item = this.createScriptListItem(script);
      this.listContainer.appendChild(item);
    }
  }

  createScriptListItem(script) {
    const item = document.createElement('div');
    item.className = 'script-list-item';
    item.dataset.scriptId = script.id;

    const isRunning = window.scriptRunner?.isRunning(script.id);
    if (isRunning) {
      item.classList.add('running');
    }

    item.innerHTML = `
      <span class="script-status ${isRunning ? 'running' : ''}"></span>
      <span class="script-name">${this.escapeHtml(script.name)}</span>
      <button class="btn btn-small btn-danger script-delete" title="Delete">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    `;

    // Click to select
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.script-delete')) {
        this.selectScript(script.id);
      }
    });

    // Delete button
    item.querySelector('.script-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteScript(script.id);
    });

    return item;
  }

  selectScript(scriptId) {
    const script = this.scripts.get(scriptId);
    if (!script) return;

    // Update selection UI
    this.listContainer.querySelectorAll('.script-list-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.scriptId === scriptId);
    });

    // Load into editor
    if (window.scriptEditor) {
      window.scriptEditor.loadScript(script);
    }
  }

  updateScriptListUI() {
    // Re-render to update running states
    this.renderScriptList();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize and export
window.scriptManager = new ScriptManager();

// Load scripts when connected
if (window.app?.client?.connected) {
  window.scriptManager.loadScripts();
}
