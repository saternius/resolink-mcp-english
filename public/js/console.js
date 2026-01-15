/**
 * ConsolePanel - Script output display
 */

class ConsolePanel {
  constructor(outputElement) {
    this.output = outputElement;
    this.maxLines = 500;
    this.lineCount = 0;
  }

  formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return String(value);
      }
    }
    return String(value);
  }

  formatArgs(args) {
    return args.map(arg => this.formatValue(arg)).join(' ');
  }

  addLine(type, scriptId, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = scriptId ? `[${scriptId}]` : '';
    const message = this.formatArgs(args);

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.innerHTML = `
      <span class="console-time">${timestamp}</span>
      ${prefix ? `<span class="console-prefix">${prefix}</span>` : ''}
      <span class="console-message">${this.escapeHtml(message)}</span>
    `;

    this.output.appendChild(line);
    this.lineCount++;

    // Prune old lines
    while (this.lineCount > this.maxLines) {
      this.output.removeChild(this.output.firstChild);
      this.lineCount--;
    }

    // Auto-scroll to bottom
    this.output.scrollTop = this.output.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  log(...args) {
    this.addLine('log', null, ...args);
  }

  info(...args) {
    this.addLine('info', null, ...args);
  }

  warn(...args) {
    this.addLine('warn', null, ...args);
  }

  error(...args) {
    this.addLine('error', null, ...args);
  }

  // Script-specific logging (with script ID prefix)
  scriptLog(scriptId, ...args) {
    this.addLine('log', scriptId, ...args);
  }

  scriptWarn(scriptId, ...args) {
    this.addLine('warn', scriptId, ...args);
  }

  scriptError(scriptId, ...args) {
    this.addLine('error', scriptId, ...args);
  }

  clear() {
    this.output.innerHTML = '';
    this.lineCount = 0;
  }
}

// Make available globally
window.ConsolePanel = ConsolePanel;
