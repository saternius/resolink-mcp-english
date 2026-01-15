/**
 * SlotTree - Hierarchical slot explorer with expand/collapse
 */

class SlotTree {
  constructor() {
    this.container = document.getElementById('slot-tree');
    this.expandedSlots = new Set();
    this.selectedSlotId = null;
  }

  render(rootSlot) {
    this.container.innerHTML = '';
    const tree = this.createSlotNode(rootSlot, 0);
    this.container.appendChild(tree);
  }

  createSlotNode(slot, depth) {
    const node = document.createElement('div');
    node.className = 'tree-node';
    node.dataset.slotId = slot.id;
    node.dataset.depth = depth;

    const hasChildren = slot.children && slot.children.length > 0;
    const isExpanded = this.expandedSlots.has(slot.id);
    const name = slot.name?.value || slot.id;
    const isActive = slot.isActive?.value !== false;

    // Item row
    const item = document.createElement('div');
    item.className = 'tree-item';
    if (this.selectedSlotId === slot.id) {
      item.classList.add('selected');
    }
    if (!isActive) {
      item.classList.add('inactive');
    }
    item.style.paddingLeft = `${depth * 16 + 4}px`;

    // Expand toggle
    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    if (hasChildren || slot.childCount > 0) {
      toggle.innerHTML = isExpanded
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleExpand(slot.id, node);
      });
    }
    item.appendChild(toggle);

    // Icon
    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.innerHTML = this.getSlotIcon(slot);
    item.appendChild(icon);

    // Label
    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = name;
    item.appendChild(label);

    // Click to select
    item.addEventListener('click', () => this.selectSlot(slot.id, item));

    // Right-click context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.selectSlot(slot.id, item);
      window.app.showContextMenu(e.clientX, e.clientY, slot.id);
    });

    node.appendChild(item);

    // Children container
    if (hasChildren && isExpanded) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      for (const child of slot.children) {
        children.appendChild(this.createSlotNode(child, depth + 1));
      }
      node.appendChild(children);
    }

    return node;
  }

  getSlotIcon(slot) {
    // Determine icon based on slot properties or components
    const name = slot.name?.value?.toLowerCase() || '';

    if (name.includes('light')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    }
    if (name.includes('camera')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    }
    if (name.includes('canvas') || name.includes('ui')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>';
    }
    if (name.includes('flux') || name.includes('protoflux')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    }

    // Default folder icon
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
  }

  selectSlot(slotId, itemElement) {
    // Remove previous selection
    this.container.querySelectorAll('.tree-item.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Add new selection
    itemElement.classList.add('selected');
    this.selectedSlotId = slotId;

    // Notify app
    window.app.selectSlot(slotId);
  }

  async toggleExpand(slotId, nodeElement) {
    if (this.expandedSlots.has(slotId)) {
      // Collapse
      this.expandedSlots.delete(slotId);
      const children = nodeElement.querySelector('.tree-children');
      if (children) {
        children.remove();
      }
      const toggle = nodeElement.querySelector('.tree-toggle');
      toggle.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    } else {
      // Expand
      this.expandedSlots.add(slotId);
      const toggle = nodeElement.querySelector('.tree-toggle');
      toggle.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';

      // Fetch children
      const children = await window.app.expandSlot(slotId);
      if (children && children.length > 0) {
        const depth = parseInt(nodeElement.dataset.depth) + 1;
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        for (const child of children) {
          childrenContainer.appendChild(this.createSlotNode(child, depth));
        }
        nodeElement.appendChild(childrenContainer);
      }
    }
  }
}

// Initialize and export
window.slotTree = new SlotTree();
