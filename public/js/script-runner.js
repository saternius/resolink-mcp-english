/**
 * ScriptRunner - Script execution engine with requestAnimationFrame loop
 */

class ScriptRunner {
  constructor() {
    this.runningScripts = new Map();
    this.rafId = null;
    this.lastTime = 0;
    this.startTime = 0;
  }

  /**
   * Execute a script and start its lifecycle
   */
  async run(scriptId, scriptName, code, targetSlotId) {
    if (this.runningScripts.has(scriptId)) {
      window.scriptConsole?.warn(`Script ${scriptName} is already running`);
      return false;
    }

    if (!window.app?.client?.connected) {
      window.scriptConsole?.error('Not connected to ResoniteLink');
      return false;
    }

    try {
      // Create context for this script
      const context = new ScriptContext(
        scriptId,
        scriptName,
        targetSlotId || window.app.selectedSlotId || ROOT_SLOT_ID,
        window.app.client
      );

      // Parse and execute the script to get lifecycle hooks
      const lifecycle = this.executeScript(code, context);

      // Store running script
      const runningScript = {
        id: scriptId,
        name: scriptName,
        context,
        lifecycle,
        startTime: performance.now(),
      };
      this.runningScripts.set(scriptId, runningScript);

      // Call onStart if provided
      if (lifecycle.onStart) {
        try {
          await lifecycle.onStart(context);
        } catch (error) {
          window.scriptConsole?.scriptError(scriptName, 'onStart error:', error.message);
        }
      }

      window.scriptConsole?.log(`Started script: ${scriptName}`);

      // Start the update loop if not already running
      this.startLoop();

      // Update UI
      this.updateRunningUI();

      return true;
    } catch (error) {
      window.scriptConsole?.error(`Failed to run script ${scriptName}:`, error.message);
      return false;
    }
  }

  /**
   * Execute script code and extract lifecycle hooks
   */
  executeScript(code, context) {
    // Wrap user code to extract lifecycle hooks
    const wrappedCode = `
      "use strict";
      let onStart, onUpdate, onDestroy;
      ${code}
      return { onStart, onUpdate, onDestroy };
    `;

    try {
      // Create function with ctx as the only available binding
      const factory = new Function('ctx', wrappedCode);
      const lifecycle = factory(context);
      return lifecycle;
    } catch (error) {
      throw new Error(`Script parse error: ${error.message}`);
    }
  }

  /**
   * Stop a running script
   */
  async stop(scriptId) {
    const script = this.runningScripts.get(scriptId);
    if (!script) {
      return false;
    }

    // Call onDestroy if provided
    if (script.lifecycle.onDestroy) {
      try {
        await script.lifecycle.onDestroy(script.context);
      } catch (error) {
        window.scriptConsole?.scriptError(script.name, 'onDestroy error:', error.message);
      }
    }

    // Remove from running scripts
    this.runningScripts.delete(scriptId);

    window.scriptConsole?.log(`Stopped script: ${script.name}`);

    // Stop the loop if no scripts are running
    if (this.runningScripts.size === 0) {
      this.stopLoop();
    }

    // Update UI
    this.updateRunningUI();

    return true;
  }

  /**
   * Stop all running scripts
   */
  async stopAll() {
    const scriptIds = Array.from(this.runningScripts.keys());
    for (const scriptId of scriptIds) {
      await this.stop(scriptId);
    }
  }

  /**
   * Check if a script is running
   */
  isRunning(scriptId) {
    return this.runningScripts.has(scriptId);
  }

  /**
   * Get running script info
   */
  getRunningScript(scriptId) {
    return this.runningScripts.get(scriptId);
  }

  /**
   * Get all running script IDs
   */
  getRunningScriptIds() {
    return Array.from(this.runningScripts.keys());
  }

  // ============================================
  // Update Loop
  // ============================================

  startLoop() {
    if (this.rafId !== null) return;

    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick(currentTime) {
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    const elapsedTime = (currentTime - this.startTime) / 1000;
    this.lastTime = currentTime;

    // Update each running script
    for (const script of this.runningScripts.values()) {
      // Update context time values
      script.context.time = (currentTime - script.startTime) / 1000;
      script.context.deltaTime = deltaTime;
      script.context.frameCount++;

      // Call onUpdate if provided
      if (script.lifecycle.onUpdate) {
        try {
          script.lifecycle.onUpdate(script.context);
        } catch (error) {
          window.scriptConsole?.scriptError(script.name, 'onUpdate error:', error.message);
          // Optionally stop script on error
          // this.stop(script.id);
        }
      }
    }

    // Continue loop if there are running scripts
    if (this.runningScripts.size > 0) {
      this.rafId = requestAnimationFrame((t) => this.tick(t));
    } else {
      this.rafId = null;
    }
  }

  // ============================================
  // UI Updates
  // ============================================

  updateRunningUI() {
    // Update script list to show running state
    if (window.scriptManager) {
      window.scriptManager.updateScriptListUI();
    }

    // Update run/stop buttons if current script
    if (window.scriptEditor) {
      window.scriptEditor.updateButtonState();
    }
  }
}

// Initialize and export
window.scriptRunner = new ScriptRunner();
