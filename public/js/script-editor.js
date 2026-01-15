/**
 * ScriptEditor - Monaco Editor integration for script editing
 */

class ScriptEditor {
  constructor() {
    this.container = document.getElementById('monaco-editor');
    this.nameElement = document.getElementById('script-name');
    this.runBtn = document.getElementById('run-script-btn');
    this.stopBtn = document.getElementById('stop-script-btn');
    this.saveBtn = document.getElementById('save-script-btn');

    this.editor = null;
    this.currentScript = null;
    this.monacoLoaded = false;
    this.isDirty = false;

    this.bindEvents();
  }

  bindEvents() {
    this.runBtn?.addEventListener('click', () => this.runScript());
    this.stopBtn?.addEventListener('click', () => this.stopScript());
    this.saveBtn?.addEventListener('click', () => this.saveScript());
  }

  /**
   * Initialize Monaco Editor (lazy load)
   */
  initMonaco() {
    if (this.editor || this.monacoLoaded) return;
    this.monacoLoaded = true;

    // Configure AMD loader
    require.config({
      paths: {
        'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
      }
    });

    require(['vs/editor/editor.main'], () => {
      // Define ScriptContext type hints
      this.registerTypeDefinitions();

      // Create editor
      this.editor = monaco.editor.create(this.container, {
        value: '// Select a script to edit',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        insertSpaces: true,
      });

      // Track changes
      this.editor.onDidChangeModelContent(() => {
        if (this.currentScript) {
          this.isDirty = true;
          this.updateButtonState();
        }
      });

      // Ctrl+S to save
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.saveScript();
      });

      // Ctrl+Enter to run
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        this.runScript();
      });

      window.scriptConsole?.log('Monaco Editor initialized');

      // If a script was waiting to load, load it now
      if (this.currentScript) {
        this.editor.setValue(this.currentScript.code);
      }
    });
  }

  /**
   * Register TypeScript definitions for IntelliSense
   */
  registerTypeDefinitions() {
    const contextTypeDefs = `
      interface ScriptContext {
        /** Unique ID of this script instance */
        scriptId: string;
        /** Display name of the script */
        scriptName: string;
        /** Target slot ID for this script */
        targetSlotId: string;

        /** User-defined variables persisted across frames */
        vars: Record<string, any>;

        /** Time elapsed since script started (seconds) */
        time: number;
        /** Time since last frame (seconds) */
        deltaTime: number;
        /** Number of frames since script started */
        frameCount: number;

        /** Slot operations */
        slot: {
          get(slotId?: string, options?: { depth?: number; includeComponentData?: boolean }): Promise<any>;
          getChildren(slotId?: string): Promise<any[]>;
          update(props: { position?: Vec3; rotation?: Quat; scale?: Vec3; name?: string; isActive?: boolean }): Promise<any>;
          updateById(slotId: string, props: any): Promise<any>;
          find(name: string, parentId?: string, depth?: number): Promise<any>;
          create(options: { name: string; parentId?: string; position?: Vec3; rotation?: Quat; scale?: Vec3 }): Promise<any>;
          remove(slotId: string): Promise<any>;
        };

        /** Component operations */
        component: {
          list(slotId?: string): Promise<any[]>;
          get(componentId: string): Promise<any>;
          add(componentType: string, slotId?: string): Promise<any>;
          update(componentId: string, members: Record<string, any>): Promise<any>;
          remove(componentId: string): Promise<any>;
          findByType(typeName: string, slotId?: string): Promise<any>;
        };

        /** Math utilities */
        math: {
          eulerToQuat(x: number, y: number, z: number): Quat;
          lerp(a: number, b: number, t: number): number;
          clamp(value: number, min: number, max: number): number;
          color(r: number, g: number, b: number, a?: number): ColorX;
          hsvToColor(h: number, s: number, v: number, a?: number): ColorX;
        };

        /** Log a message to the console */
        log(...args: any[]): void;
        /** Log a warning to the console */
        warn(...args: any[]): void;
        /** Log an error to the console */
        error(...args: any[]): void;
        /** Stop this script */
        stop(): void;
      }

      interface Vec3 { x: number; y: number; z: number; }
      interface Quat { x: number; y: number; z: number; w: number; }
      interface ColorX { r: number; g: number; b: number; a: number; profile?: string; }

      /** Called once when script starts */
      declare let onStart: ((ctx: ScriptContext) => void | Promise<void>) | undefined;
      /** Called every frame (~60fps) */
      declare let onUpdate: ((ctx: ScriptContext) => void) | undefined;
      /** Called when script stops */
      declare let onDestroy: ((ctx: ScriptContext) => void | Promise<void>) | undefined;
      /** The script context - available in lifecycle hooks */
      declare const ctx: ScriptContext;
    `;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      contextTypeDefs,
      'ts:script-context.d.ts'
    );

    // Enable better JS support
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      checkJs: true,
      allowJs: true,
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
  }

  /**
   * Load a script into the editor
   */
  loadScript(script) {
    this.currentScript = script;
    this.isDirty = false;

    // Update name display
    if (this.nameElement) {
      this.nameElement.textContent = script.name;
    }

    // Load code into editor
    if (this.editor) {
      this.editor.setValue(script.code);
    }

    this.updateButtonState();
  }

  /**
   * Clear the editor
   */
  clearEditor() {
    this.currentScript = null;
    this.isDirty = false;

    if (this.nameElement) {
      this.nameElement.textContent = 'No script selected';
    }

    if (this.editor) {
      this.editor.setValue('// Select a script to edit');
    }

    this.updateButtonState();
  }

  /**
   * Get current editor content
   */
  getCode() {
    return this.editor?.getValue() || '';
  }

  /**
   * Update run/stop/save button states
   */
  updateButtonState() {
    const hasScript = !!this.currentScript;
    const isRunning = hasScript && window.scriptRunner?.isRunning(this.currentScript.id);

    if (this.runBtn) {
      this.runBtn.disabled = !hasScript || isRunning;
    }

    if (this.stopBtn) {
      this.stopBtn.disabled = !hasScript || !isRunning;
    }

    if (this.saveBtn) {
      this.saveBtn.disabled = !hasScript;
      // Visual indicator for unsaved changes
      if (this.isDirty) {
        this.saveBtn.classList.add('dirty');
      } else {
        this.saveBtn.classList.remove('dirty');
      }
    }
  }

  // ============================================
  // Script Operations
  // ============================================

  async saveScript() {
    if (!this.currentScript) return;

    const code = this.getCode();
    const success = await window.scriptManager?.saveScript(this.currentScript.id, code);

    if (success) {
      this.currentScript.code = code;
      this.isDirty = false;
      this.updateButtonState();
    }
  }

  async runScript() {
    if (!this.currentScript) return;

    // Auto-save before running
    if (this.isDirty) {
      await this.saveScript();
    }

    const code = this.getCode();
    const success = await window.scriptRunner?.run(
      this.currentScript.id,
      this.currentScript.name,
      code,
      this.currentScript.targetSlotId || window.app?.selectedSlotId
    );

    if (success) {
      this.updateButtonState();
    }
  }

  async stopScript() {
    if (!this.currentScript) return;

    await window.scriptRunner?.stop(this.currentScript.id);
    this.updateButtonState();
  }
}

// Initialize and export
window.scriptEditor = new ScriptEditor();
