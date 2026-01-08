import * as fs from 'fs';
import * as path from 'path';

export interface ComponentInfo {
  name: string;
  fullPath: string;
  category?: string;
  baseClass?: string;
  interfaces?: string[];
  members: MemberInfo[];
}

export interface MemberInfo {
  name: string;
  type: string;
  attributes?: string[];
}

export interface SearchOptions {
  caseSensitive?: boolean;
  maxResults?: number;
}

const DEFAULT_DECOMPILE_PATH = 'C:\\Users\\neo\\GitHub\\reso-decompile\\sources';

export class DecompileSearch {
  private basePath: string;
  private componentCache: Map<string, ComponentInfo> = new Map();
  private indexBuilt: boolean = false;

  constructor(basePath: string = DEFAULT_DECOMPILE_PATH) {
    this.basePath = basePath;
  }

  /**
   * Search for components by name (partial match)
   */
  async searchComponents(query: string, options: SearchOptions = {}): Promise<ComponentInfo[]> {
    const { caseSensitive = false, maxResults = 50 } = options;
    const results: ComponentInfo[] = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    const frooxEnginePath = path.join(this.basePath, 'FrooxEngine');
    if (!fs.existsSync(frooxEnginePath)) {
      throw new Error(`FrooxEngine path not found: ${frooxEnginePath}`);
    }

    const files = fs.readdirSync(frooxEnginePath).filter(f => f.endsWith('.cs'));

    for (const file of files) {
      const fileName = file.replace('.cs', '');
      const compareFileName = caseSensitive ? fileName : fileName.toLowerCase();

      if (compareFileName.includes(searchQuery)) {
        const info = await this.getComponentInfo(path.join(frooxEnginePath, file));
        if (info) {
          results.push(info);
          if (results.length >= maxResults) break;
        }
      }
    }

    return results;
  }

  /**
   * Search for components by category
   */
  async searchByCategory(category: string, options: SearchOptions = {}): Promise<ComponentInfo[]> {
    const { caseSensitive = false, maxResults = 100 } = options;
    const results: ComponentInfo[] = [];
    const searchCategory = caseSensitive ? category : category.toLowerCase();

    const frooxEnginePath = path.join(this.basePath, 'FrooxEngine');
    const files = fs.readdirSync(frooxEnginePath).filter(f => f.endsWith('.cs'));

    for (const file of files) {
      const info = await this.getComponentInfo(path.join(frooxEnginePath, file));
      if (info?.category) {
        const compareCategory = caseSensitive ? info.category : info.category.toLowerCase();
        if (compareCategory.includes(searchCategory)) {
          results.push(info);
          if (results.length >= maxResults) break;
        }
      }
    }

    return results;
  }

  /**
   * Search for components that have a specific member
   */
  async searchByMember(memberName: string, options: SearchOptions = {}): Promise<ComponentInfo[]> {
    const { caseSensitive = false, maxResults = 50 } = options;
    const results: ComponentInfo[] = [];
    const searchMember = caseSensitive ? memberName : memberName.toLowerCase();

    const frooxEnginePath = path.join(this.basePath, 'FrooxEngine');
    const files = fs.readdirSync(frooxEnginePath).filter(f => f.endsWith('.cs'));

    for (const file of files) {
      const info = await this.getComponentInfo(path.join(frooxEnginePath, file));
      if (info) {
        const hasMatch = info.members.some(m => {
          const compareName = caseSensitive ? m.name : m.name.toLowerCase();
          return compareName.includes(searchMember);
        });
        if (hasMatch) {
          results.push(info);
          if (results.length >= maxResults) break;
        }
      }
    }

    return results;
  }

  /**
   * Get detailed info about a specific component
   */
  async getComponent(componentName: string): Promise<ComponentInfo | null> {
    // Try exact match first
    const frooxEnginePath = path.join(this.basePath, 'FrooxEngine');
    const exactPath = path.join(frooxEnginePath, `${componentName}.cs`);

    if (fs.existsSync(exactPath)) {
      return this.getComponentInfo(exactPath);
    }

    // Try case-insensitive search
    const files = fs.readdirSync(frooxEnginePath).filter(f => f.endsWith('.cs'));
    const lowerName = componentName.toLowerCase();
    const match = files.find(f => f.toLowerCase() === `${lowerName}.cs`);

    if (match) {
      return this.getComponentInfo(path.join(frooxEnginePath, match));
    }

    return null;
  }

  /**
   * List all available categories
   */
  async listCategories(): Promise<string[]> {
    const categories = new Set<string>();
    const frooxEnginePath = path.join(this.basePath, 'FrooxEngine');
    const files = fs.readdirSync(frooxEnginePath).filter(f => f.endsWith('.cs'));

    for (const file of files) {
      const info = await this.getComponentInfo(path.join(frooxEnginePath, file));
      if (info?.category) {
        categories.add(info.category);
      }
    }

    return Array.from(categories).sort();
  }

  /**
   * Search in all source directories (not just FrooxEngine)
   */
  async searchAllSources(query: string, options: SearchOptions = {}): Promise<{ file: string; matches: string[] }[]> {
    const { caseSensitive = false, maxResults = 100 } = options;
    const results: { file: string; matches: string[] }[] = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    const searchDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) return;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.name.endsWith('.cs')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            const matches: string[] = [];

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const compareLine = caseSensitive ? line : line.toLowerCase();
              if (compareLine.includes(searchQuery)) {
                matches.push(`${i + 1}: ${line.trim().substring(0, 100)}`);
              }
            }

            if (matches.length > 0) {
              results.push({
                file: fullPath.replace(this.basePath + path.sep, ''),
                matches: matches.slice(0, 10), // Limit matches per file
              });
            }
          } catch (e) {
            // Skip files that can't be read
          }
        }
      }
    };

    searchDir(this.basePath);
    return results;
  }

  /**
   * Get the full source code of a component
   */
  async getComponentSource(componentName: string): Promise<string | null> {
    const info = await this.getComponent(componentName);
    if (!info) return null;

    return fs.readFileSync(info.fullPath, 'utf-8');
  }

  /**
   * Parse a C# file to extract component info
   */
  private async getComponentInfo(filePath: string): Promise<ComponentInfo | null> {
    // Check cache
    if (this.componentCache.has(filePath)) {
      return this.componentCache.get(filePath)!;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      const info: ComponentInfo = {
        name: path.basename(filePath, '.cs'),
        fullPath: filePath,
        members: [],
      };

      // Parse category
      const categoryMatch = content.match(/\[Category\(new string\[\]\s*{\s*"([^"]+)"/);
      if (categoryMatch) {
        info.category = categoryMatch[1];
      }

      // Parse class declaration
      const classMatch = content.match(/public\s+(?:abstract\s+)?class\s+(\w+)\s*(?::\s*([^{]+))?/);
      if (classMatch) {
        info.name = classMatch[1];
        if (classMatch[2]) {
          const inheritance = classMatch[2].split(',').map(s => s.trim());
          info.baseClass = inheritance[0];
          info.interfaces = inheritance.slice(1);
        }
      }

      // Parse members (Sync<T>, AssetRef<T>, etc.)
      const memberPatterns = [
        /public\s+(?:readonly\s+)?Sync<([^>]+)>\s+(\w+)/g,
        /public\s+(?:readonly\s+)?AssetRef<([^>]+)>\s+(\w+)/g,
        /public\s+(?:readonly\s+)?SyncRef<([^>]+)>\s+(\w+)/g,
        /public\s+(?:readonly\s+)?SyncList<([^>]+)>\s+(\w+)/g,
        /public\s+(?:readonly\s+)?SyncDelegate<([^>]+)>\s+(\w+)/g,
        /public\s+(?:readonly\s+)?SyncPlayback\s+(\w+)/g,
      ];

      for (const pattern of memberPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (match.length === 3) {
            info.members.push({
              name: match[2],
              type: match[1],
            });
          } else if (match.length === 2) {
            info.members.push({
              name: match[1],
              type: 'SyncPlayback',
            });
          }
        }
      }

      // Parse Range attributes
      const rangePattern = /\[Range\([^)]+\)\]\s*\n\s*public\s+(?:readonly\s+)?(?:Sync<[^>]+>|AssetRef<[^>]+>)\s+(\w+)/g;
      let rangeMatch: RegExpExecArray | null;
      while ((rangeMatch = rangePattern.exec(content)) !== null) {
        const member = info.members.find(m => m.name === rangeMatch![1]);
        if (member) {
          member.attributes = member.attributes || [];
          member.attributes.push('Range');
        }
      }

      this.componentCache.set(filePath, info);
      return info;
    } catch (e) {
      return null;
    }
  }

  /**
   * Format component info for display
   */
  formatComponentInfo(info: ComponentInfo): string {
    let result = `=== ${info.name} ===\n`;
    if (info.category) result += `Category: ${info.category}\n`;
    if (info.baseClass) result += `Base: ${info.baseClass}\n`;
    if (info.interfaces?.length) result += `Interfaces: ${info.interfaces.join(', ')}\n`;
    if (info.members.length > 0) {
      result += `\nMembers:\n`;
      for (const member of info.members) {
        const attrs = member.attributes ? ` [${member.attributes.join(', ')}]` : '';
        result += `  - ${member.name}: ${member.type}${attrs}\n`;
      }
    }
    return result;
  }
}

// Export default instance
export const decompileSearch = new DecompileSearch();
