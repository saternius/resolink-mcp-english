/**
 * ComponentEditor - Dynamic property editors by member type
 */

class ComponentEditor {
  constructor() {
    this.container = document.getElementById('inspector');
    this.currentSlot = null;
    this.pendingUpdates = new Map();
    this.updateDebounceMs = 300;
  }

  render(slot) {
    this.currentSlot = slot;
    this.container.innerHTML = '';

    // Slot header
    const header = this.createSlotHeader(slot);
    this.container.appendChild(header);

    // Slot properties
    const slotProps = this.createSlotProperties(slot);
    this.container.appendChild(slotProps);

    // Components
    if (slot.components && slot.components.length > 0) {
      const componentsSection = document.createElement('div');
      componentsSection.className = 'inspector-section';

      const componentsHeader = document.createElement('h3');
      componentsHeader.className = 'inspector-section-title';
      componentsHeader.textContent = `Components (${slot.components.length})`;
      componentsSection.appendChild(componentsHeader);

      for (const component of slot.components) {
        const compCard = this.createComponentCard(component);
        componentsSection.appendChild(compCard);
      }

      this.container.appendChild(componentsSection);
    }
  }

  createSlotHeader(slot) {
    const header = document.createElement('div');
    header.className = 'inspector-header';

    const name = slot.name?.value || slot.id;
    header.innerHTML = `
      <h2 class="inspector-title">${this.escapeHtml(name)}</h2>
      <div class="inspector-id">${slot.id}</div>
    `;

    return header;
  }

  createSlotProperties(slot) {
    const section = document.createElement('div');
    section.className = 'inspector-section';

    const title = document.createElement('h3');
    title.className = 'inspector-section-title';
    title.textContent = 'Transform';
    section.appendChild(title);

    // Name
    section.appendChild(this.createPropertyRow('name', 'Name', 'string', slot.name?.value || '', (value) => {
      this.updateSlotProperty('name', value);
    }));

    // Position
    const pos = slot.position?.value || { x: 0, y: 0, z: 0 };
    section.appendChild(this.createVector3Row('position', 'Position', pos, (value) => {
      this.updateSlotProperty('position', value);
    }));

    // Rotation (as euler for display)
    const rot = slot.rotation?.value || { x: 0, y: 0, z: 0, w: 1 };
    section.appendChild(this.createQuaternionRow('rotation', 'Rotation', rot, (value) => {
      this.updateSlotProperty('rotation', value);
    }));

    // Scale
    const scale = slot.scale?.value || { x: 1, y: 1, z: 1 };
    section.appendChild(this.createVector3Row('scale', 'Scale', scale, (value) => {
      this.updateSlotProperty('scale', value);
    }));

    // Active
    const isActive = slot.isActive?.value !== false;
    section.appendChild(this.createPropertyRow('isActive', 'Active', 'bool', isActive, (value) => {
      this.updateSlotProperty('isActive', value);
    }));

    return section;
  }

  createComponentCard(component) {
    const card = document.createElement('div');
    card.className = 'component-card';

    // Header
    const header = document.createElement('div');
    header.className = 'component-header';

    const typeName = this.getComponentTypeName(component.componentType);
    header.innerHTML = `
      <span class="component-name">${this.escapeHtml(typeName)}</span>
      <button class="btn btn-small btn-danger component-remove" title="Remove Component">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    header.querySelector('.component-remove').addEventListener('click', () => {
      this.removeComponent(component.id);
    });

    card.appendChild(header);

    // Members
    if (component.members) {
      const members = document.createElement('div');
      members.className = 'component-members';

      for (const [memberName, memberData] of Object.entries(component.members)) {
        if (memberName === 'id' || memberName === 'componentType') continue;
        if (memberData.$type === 'empty') continue; // Skip output-only members

        const row = this.createMemberRow(component.id, memberName, memberData);
        if (row) {
          members.appendChild(row);
        }
      }

      card.appendChild(members);
    }

    return card;
  }

  getComponentTypeName(fullType) {
    if (!fullType) return 'Unknown';
    // Extract just the class name from full type path
    const parts = fullType.split('.');
    return parts[parts.length - 1];
  }

  createMemberRow(componentId, memberName, memberData) {
    const type = memberData.$type;
    const value = memberData.value;

    switch (type) {
      case 'float':
        return this.createPropertyRow(memberName, memberName, 'float', value, (newValue) => {
          this.updateComponentMember(componentId, memberName, { $type: 'float', value: parseFloat(newValue) });
        });

      case 'int':
        return this.createPropertyRow(memberName, memberName, 'int', value, (newValue) => {
          this.updateComponentMember(componentId, memberName, { $type: 'int', value: parseInt(newValue) });
        });

      case 'bool':
        return this.createPropertyRow(memberName, memberName, 'bool', value, (newValue) => {
          this.updateComponentMember(componentId, memberName, { $type: 'bool', value: newValue });
        });

      case 'string':
        return this.createPropertyRow(memberName, memberName, 'string', value || '', (newValue) => {
          this.updateComponentMember(componentId, memberName, { $type: 'string', value: newValue });
        });

      case 'float2':
        return this.createVector2Row(memberName, memberName, value || { x: 0, y: 0 }, (newValue) => {
          this.updateComponentMember(componentId, memberName, { $type: 'float2', value: newValue });
        });

      case 'float3':
        return this.createVector3Row(memberName, memberName, value || { x: 0, y: 0, z: 0 }, (newValue) => {
          this.updateComponentMember(componentId, memberName, { $type: 'float3', value: newValue });
        });

      case 'floatQ':
        return this.createQuaternionRow(memberName, memberName, value || { x: 0, y: 0, z: 0, w: 1 }, (newValue) => {
          this.updateComponentMember(componentId, memberName, { $type: 'floatQ', value: newValue });
        });

      case 'colorX':
        return this.createColorRow(memberName, memberName, value || { r: 1, g: 1, b: 1, a: 1 }, (newValue) => {
          this.updateComponentMember(componentId, memberName, { $type: 'colorX', value: newValue });
        });

      case 'enum':
        return this.createEnumRow(memberName, memberName, value, memberData.enumType, memberData.options, (newValue) => {
          this.updateComponentMember(componentId, memberName, { $type: 'enum', value: newValue, enumType: memberData.enumType });
        });

      case 'reference':
        return this.createReferenceRow(memberName, memberName, memberData.targetId, memberData.id);

      case 'list':
        // Skip list rendering for now
        return null;

      default:
        // Unknown type, show as read-only
        return this.createReadOnlyRow(memberName, memberName, JSON.stringify(value));
    }
  }

  // ============================================
  // Property Row Builders
  // ============================================

  createPropertyRow(key, label, type, value, onChange) {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'property-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'property-input';

    if (type === 'bool') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = value;
      checkbox.addEventListener('change', () => onChange(checkbox.checked));
      inputContainer.appendChild(checkbox);
    } else if (type === 'float' || type === 'int') {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'input';
      input.value = value ?? 0;
      input.step = type === 'float' ? '0.01' : '1';
      input.addEventListener('change', () => onChange(input.value));
      inputContainer.appendChild(input);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input';
      input.value = value ?? '';
      input.addEventListener('change', () => onChange(input.value));
      inputContainer.appendChild(input);
    }

    row.appendChild(inputContainer);
    return row;
  }

  createVector2Row(key, label, value, onChange) {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'property-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'property-input vector-input';

    const current = { x: value.x ?? 0, y: value.y ?? 0 };

    ['x', 'y'].forEach(axis => {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'input';
      input.placeholder = axis.toUpperCase();
      input.value = current[axis];
      input.step = '0.01';
      input.addEventListener('change', () => {
        current[axis] = parseFloat(input.value) || 0;
        onChange(current);
      });
      inputContainer.appendChild(input);
    });

    row.appendChild(inputContainer);
    return row;
  }

  createVector3Row(key, label, value, onChange) {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'property-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'property-input vector-input';

    const current = { x: value.x ?? 0, y: value.y ?? 0, z: value.z ?? 0 };

    ['x', 'y', 'z'].forEach(axis => {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'input';
      input.placeholder = axis.toUpperCase();
      input.value = current[axis];
      input.step = '0.01';
      input.addEventListener('change', () => {
        current[axis] = parseFloat(input.value) || 0;
        onChange(current);
      });
      inputContainer.appendChild(input);
    });

    row.appendChild(inputContainer);
    return row;
  }

  createQuaternionRow(key, label, value, onChange) {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'property-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'property-input vector-input';

    const current = { x: value.x ?? 0, y: value.y ?? 0, z: value.z ?? 0, w: value.w ?? 1 };

    ['x', 'y', 'z', 'w'].forEach(axis => {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'input';
      input.placeholder = axis.toUpperCase();
      input.value = current[axis];
      input.step = '0.01';
      input.addEventListener('change', () => {
        current[axis] = parseFloat(input.value) || 0;
        onChange(current);
      });
      inputContainer.appendChild(input);
    });

    row.appendChild(inputContainer);
    return row;
  }

  createColorRow(key, label, value, onChange) {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'property-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'property-input color-input';

    const current = {
      r: value.r ?? 1,
      g: value.g ?? 1,
      b: value.b ?? 1,
      a: value.a ?? 1,
      profile: value.profile || 'sRGB'
    };

    // Color picker
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = this.rgbToHex(current.r, current.g, current.b);
    colorPicker.addEventListener('change', () => {
      const rgb = this.hexToRgb(colorPicker.value);
      current.r = rgb.r;
      current.g = rgb.g;
      current.b = rgb.b;
      onChange(current);
    });
    inputContainer.appendChild(colorPicker);

    // Alpha slider
    const alphaInput = document.createElement('input');
    alphaInput.type = 'number';
    alphaInput.className = 'input';
    alphaInput.min = '0';
    alphaInput.max = '1';
    alphaInput.step = '0.01';
    alphaInput.value = current.a;
    alphaInput.placeholder = 'A';
    alphaInput.addEventListener('change', () => {
      current.a = parseFloat(alphaInput.value) || 1;
      onChange(current);
    });
    inputContainer.appendChild(alphaInput);

    row.appendChild(inputContainer);
    return row;
  }

  createEnumRow(key, label, value, enumType, options, onChange) {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'property-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'property-input';

    const select = document.createElement('select');
    select.className = 'input';

    // If options provided, use them; otherwise just show current value
    if (options && Array.isArray(options)) {
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        option.selected = opt === value;
        select.appendChild(option);
      });
    } else {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', () => onChange(select.value));
    inputContainer.appendChild(select);

    row.appendChild(inputContainer);
    return row;
  }

  createReferenceRow(key, label, targetId, refId) {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'property-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'property-input reference-input';

    const refDisplay = document.createElement('span');
    refDisplay.className = 'reference-display';
    refDisplay.textContent = targetId || '(null)';
    inputContainer.appendChild(refDisplay);

    row.appendChild(inputContainer);
    return row;
  }

  createReadOnlyRow(key, label, value) {
    const row = document.createElement('div');
    row.className = 'property-row';

    const labelEl = document.createElement('label');
    labelEl.className = 'property-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const inputContainer = document.createElement('div');
    inputContainer.className = 'property-input';

    const span = document.createElement('span');
    span.className = 'readonly-value';
    span.textContent = value;
    inputContainer.appendChild(span);

    row.appendChild(inputContainer);
    return row;
  }

  // ============================================
  // Update Methods
  // ============================================

  async updateSlotProperty(property, value) {
    if (!this.currentSlot || !window.app.client?.connected) return;

    const update = {};
    update[property] = value;

    try {
      const response = await window.app.client.updateSlot({
        id: this.currentSlot.id,
        ...update
      });

      if (response.success) {
        window.scriptConsole?.log(`Updated slot ${property}`);
      } else {
        window.scriptConsole?.error(`Failed to update slot: ${response.errorInfo}`);
      }
    } catch (error) {
      window.scriptConsole?.error(`Error updating slot: ${error.message}`);
    }
  }

  async updateComponentMember(componentId, memberName, memberData) {
    if (!window.app.client?.connected) return;

    const members = {};
    members[memberName] = memberData;

    try {
      const response = await window.app.client.updateComponent({
        id: componentId,
        members
      });

      if (response.success) {
        window.scriptConsole?.log(`Updated ${memberName}`);
      } else {
        window.scriptConsole?.error(`Failed to update component: ${response.errorInfo}`);
      }
    } catch (error) {
      window.scriptConsole?.error(`Error updating component: ${error.message}`);
    }
  }

  async removeComponent(componentId) {
    if (!window.app.client?.connected) return;

    if (!confirm('Remove this component?')) return;

    try {
      const response = await window.app.client.removeComponent(componentId);

      if (response.success) {
        window.scriptConsole?.log('Component removed');
        // Refresh inspector
        if (this.currentSlot) {
          window.app.selectSlot(this.currentSlot.id);
        }
      } else {
        window.scriptConsole?.error(`Failed to remove component: ${response.errorInfo}`);
      }
    } catch (error) {
      window.scriptConsole?.error(`Error removing component: ${error.message}`);
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  rgbToHex(r, g, b) {
    const toHex = (c) => {
      const hex = Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 1, g: 1, b: 1 };
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize and export
window.componentEditor = new ComponentEditor();
