# ResoniteLink MCP

MCP server & CLI tool for controlling Resonite VR worlds using the ResoniteLink WebSocket protocol.

---

## Getting Started

This comprehensive guide will walk you through setting up ResoniteLink MCP from scratch, including configuring Resonite, installing the project, and connecting via Claude or other MCP clients.

### What is ResoniteLink MCP?

ResoniteLink MCP is a bridge that allows AI assistants (like Claude) and external applications to programmatically control Resonite VR worlds. It provides:

- **MCP Server**: Exposes 19+ tools for Claude to create/modify slots, components, ProtoFlux nodes, and UIX interfaces
- **CLI Tool**: Command-line interface for direct world manipulation
- **TypeScript Library**: Programmatic API for building automation scripts

```
┌──────────────────────────────────────────────────────────────────┐
│                        Architecture                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐     ┌──────────────────┐     ┌──────────────┐  │
│   │   Claude    │     │  ResoniteLink    │     │   Resonite   │  │
│   │  Desktop /  │────▶│   MCP Server     │────▶│   VR World   │  │
│   │ Claude Code │ MCP │  (this project)  │ WS  │              │  │
│   └─────────────┘     └──────────────────┘     └──────────────┘  │
│                                                                   │
│   ┌─────────────┐     ┌──────────────────┐          │            │
│   │   Scripts   │────▶│ ResoniteLink     │──────────┘            │
│   │  (batch     │     │  Client Library  │ WebSocket             │
│   │   builds)   │     └──────────────────┘                       │
│   └─────────────┘                                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Prerequisites

Before starting, ensure you have:

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18.x or higher | Required for running the MCP server and scripts |
| **npm** | 9.x or higher | Comes with Node.js |
| **Resonite** | Latest | The VR platform (Steam or standalone) |
| **Git** | Any | For cloning this repository (optional) |

**Optional (for component search features):**
- Decompiled Resonite source code for the `search_components`, `get_component_info`, and `grep_source` MCP tools

### Step 1: Enable ResoniteLink in Resonite

ResoniteLink is a **built-in feature** of Resonite (not a mod). You need to enable it to allow external connections.

#### Method A: Graphical Client (Desktop/VR)

1. **Launch Resonite** and enter a world you are hosting
2. **Open the Dash Menu** (press Escape on desktop, or open your wrist menu in VR)
3. **Navigate to Session** settings
4. **Click "Enable ResoniteLink"**
5. **Note the port number** displayed (default is usually `29551`, but may vary)

> **Important**: You must be the **host** of the world to enable ResoniteLink.

#### Method B: Headless Server Configuration

Add the following to your headless server configuration JSON:

```json
{
  "enableResoniteLink": true,
  "forceResoniteLinkPort": 29551
}
```

Or use a random port:

```json
{
  "enableResoniteLink": true,
  "forceResoniteLinkPort": 0
}
```

#### Method C: Headless Server Command

If your headless server is already running, use the console command:

```
enableResoniteLink 29551
```

Or use `0` for a random port:

```
enableResoniteLink 0
```

#### Permission Requirements

| Setting | Default | Description |
|---------|---------|-------------|
| **Enable Permission** | Builder | Minimum permission level required to enable ResoniteLink |
| **Read/Write Access** | Configurable | Can be controlled via `ResoniteLinkPermissions` component in your world |

> **Note**: Existing worlds are automatically configured to only allow ResoniteLink if the host has Builder or Admin permissions.

#### Official Resources

- **ResoniteLink Documentation**: [yellow-dog-man.github.io/ResoniteLink](https://yellow-dog-man.github.io/ResoniteLink/)
- **GitHub Repository**: [github.com/Yellow-Dog-Man/ResoniteLink](https://github.com/Yellow-Dog-Man/ResoniteLink)

### Step 2: Install This Project

#### Clone the Repository

```bash
git clone https://github.com/saternius/resolink-mcp-english.git
cd resolink-mcp-english
```

Or download and extract the ZIP file from GitHub.

#### Install Dependencies

```bash
npm install
```

#### Build the Project

```bash
npm run build
```

This compiles the TypeScript source to JavaScript in the `dist/` directory.

#### Verify Installation

```bash
# Check that the build was successful
ls dist/mcp-server.js
ls dist/cli.js
```

### Step 3: Configure MCP Client

Choose the appropriate configuration method based on your MCP client:

#### Option A: Claude Code (Recommended for Development)

The project includes a pre-configured `.mcp.json` file. Update it with your local paths:

1. **Edit `.mcp.json`** in the project root:

```json
{
  "mcpServers": {
    "resonitelink": {
      "command": "node",
      "args": ["/full/path/to/resolink-mcp-english/dist/mcp-server.js"],
      "env": {
        "RESONITE_WS_URL": "ws://localhost:29551"
      }
    }
  }
}
```

**Platform-specific path examples:**

```json
// Windows
"args": ["C:/Users/YourName/projects/resolink-mcp-english/dist/mcp-server.js"]

// macOS
"args": ["/Users/YourName/projects/resolink-mcp-english/dist/mcp-server.js"]

// Linux
"args": ["/home/YourName/projects/resolink-mcp-english/dist/mcp-server.js"]
```

2. **Restart Claude Code** to load the MCP server

3. **Verify** by typing `/mcp` in Claude Code - you should see `resonitelink` listed

#### Option B: Claude Desktop

Add the following to your Claude Desktop configuration file:

**Configuration file locations:**

| OS | Path |
|----|------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

**Configuration content:**

```json
{
  "mcpServers": {
    "resonitelink": {
      "command": "node",
      "args": ["/full/path/to/resolink-mcp-english/dist/mcp-server.js"],
      "env": {
        "RESONITE_WS_URL": "ws://localhost:29551"
      }
    }
  }
}
```

> **Note**: If the file doesn't exist, create it. If it already has content, merge the `resonitelink` entry into the existing `mcpServers` object.

After saving, **restart Claude Desktop** to load the new MCP server.

#### Option C: Other MCP Clients

For other MCP-compatible clients, configure them to run:

```bash
node /path/to/resolink-mcp-english/dist/mcp-server.js
```

With environment variable:
```
RESONITE_WS_URL=ws://localhost:29551
```

### Step 4: Verify the Connection

#### Test via CLI (Recommended First Step)

Before testing MCP, verify the connection using the CLI:

```bash
# Test connection and get root slot info
node dist/cli.js root --depth 1 --url ws://localhost:29551
```

**Expected output** (if successful):

```json
{
  "success": true,
  "data": {
    "id": "Root",
    "name": "Root",
    "children": [
      { "id": "Reso_XXX", "name": "Controllers" },
      { "id": "Reso_XXX", "name": "SpawnArea" },
      ...
    ]
  }
}
```

**If you see an error**, check the [Troubleshooting](#troubleshooting) section below.

#### Test via MCP (Claude)

Once the CLI test succeeds, test via your MCP client:

1. Open Claude Code or Claude Desktop
2. Ask Claude: *"Connect to Resonite and get the root slot"*
3. Claude should use the `connect` and `get_slot` tools

**Example interaction:**

```
You: Connect to Resonite and show me what's in the world

Claude: I'll connect to Resonite and get the root slot information.
[Uses connect tool]
[Uses get_slot tool with slotId: "Root", depth: 1]

The world contains:
- Controllers (system)
- SpawnArea (system)
- Light (system)
- Skybox (system)
...
```

### Step 5: Quick Start Examples

#### Create a Simple Cube via CLI

```bash
# 1. Add a slot for the cube
node dist/cli.js add-slot --name "MyCube" --position 0,1.5,2

# 2. Find the slot ID
node dist/cli.js find --name "MyCube"
# Note the slot ID (e.g., Reso_ABC123)

# 3. Add mesh and renderer components
node dist/cli.js add-component --slot Reso_ABC123 --type "[FrooxEngine]FrooxEngine.BoxMesh"
node dist/cli.js add-component --slot Reso_ABC123 --type "[FrooxEngine]FrooxEngine.MeshRenderer"
node dist/cli.js add-component --slot Reso_ABC123 --type "[FrooxEngine]FrooxEngine.PBS_Metallic"
```

#### Create a Cube via Claude (MCP)

Simply ask:

> "Create a red cube at position (0, 1.5, 2) in Resonite"

Claude will automatically:
1. Connect to Resonite
2. Create a slot
3. Add BoxMesh, MeshRenderer, and PBS_Metallic components
4. Configure the material color

#### Run a Script

```bash
# Create a ProtoFlux calculator (1+1=2)
npx tsx src/scripts/create-flux-add.ts ws://localhost:29551

# Create a colorful house
npx tsx src/scripts/create-house3.ts ws://localhost:29551

# Create a weather widget with HTTP requests
npx tsx src/scripts/create-weather-widget.ts ws://localhost:29551
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RESONITE_WS_URL` | `ws://localhost:29551` | WebSocket URL for MCP server |
| `RESONITELINK_URL` | `ws://localhost:29551` | WebSocket URL for CLI |

**Setting environment variables:**

```bash
# Linux/macOS
export RESONITE_WS_URL=ws://localhost:29551

# Windows (PowerShell)
$env:RESONITE_WS_URL = "ws://localhost:29551"

# Windows (Command Prompt)
set RESONITE_WS_URL=ws://localhost:29551
```

### Troubleshooting

#### Connection Refused / ECONNREFUSED

```
Error: connect ECONNREFUSED 127.0.0.1:29551
```

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Resonite not running | Launch Resonite and enter a world |
| ResoniteLink not enabled | Enable ResoniteLink in Session settings |
| Wrong port | Check the actual port in Resonite and update your configuration |
| Firewall blocking | Allow Node.js through your firewall |

#### Timeout Errors

```
Error: Request timeout after 30000ms
```

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Invalid component type format | Check the [Component Type Format](#component-type-format) section |
| Network latency | Increase timeout in client options |
| Resonite is busy/frozen | Restart Resonite |

#### Permission Denied

```
Error: Permission denied
```

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Not the host | You must host the world to use ResoniteLink |
| Insufficient permissions | Need Builder level or higher |
| ResoniteLinkPermissions configured | Check the world's permission component |

#### MCP Server Not Appearing

If `resonitelink` doesn't appear in your MCP client:

1. **Verify the path** in your configuration is correct and absolute
2. **Check the build** - ensure `dist/mcp-server.js` exists
3. **Restart the client** - MCP servers load on startup
4. **Check logs** - Look for error messages in the client's console/logs

#### Component Search Not Working

The `search_components`, `get_component_info`, and `grep_source` tools require decompiled Resonite source code.

1. **Obtain decompiled sources** using a .NET decompiler (e.g., ILSpy, dnSpy) on Resonite's assemblies
2. **Update the path** in `src/mcp-server.ts` line 11:

```typescript
const decompileSearch = new DecompileSearch('/path/to/your/decompiled/sources');
```

3. **Rebuild** with `npm run build`

> **Note**: This is an optional feature. All other MCP tools work without decompiled sources.

### Next Steps

Once setup is complete, explore:

- **[Using as MCP Server](#using-as-mcp-server)** - Full list of available tools
- **[Using as CLI](#using-as-cli)** - Command-line reference
- **[Using as Library](#using-as-library)** - Programmatic API
- **[Sample Scripts](#sample-scripts)** - Ready-to-run examples
- **[Component Type Format](#component-type-format)** - How to specify components
- **[Adding ProtoFlux Components](#adding-protoflux-components)** - Visual programming nodes

For advanced patterns (UIX, ProtoFlux games, HTTP requests), see `CLAUDE.md` in the project root.

---

## Installation

```bash
npm install
npm run build
```

## Using as MCP Server

### Claude Code Configuration

Already configured in `.mcp.json` at the project root. Restart Claude Code to automatically make the MCP server available.

### Claude Desktop Configuration

Add the following to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "resonitelink": {
      "command": "node",
      "args": ["C:/Users/neo/GitHub/resolink_mcp/dist/mcp-server.js"],
      "env": {
        "RESONITE_WS_URL": "ws://localhost:29551"
      }
    }
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `connect` | Connect to Resonite |
| `disconnect` | Disconnect |
| `get_slot` | Get slot information |
| `find_slot` | Search for slot by name |
| `add_slot` | Add a slot |
| `remove_slot` | Remove a slot |
| `update_slot` | Update a slot |
| `add_component` | Add a component |
| `get_component` | Get component information |
| `update_component` | Update a component |
| `remove_component` | Remove a component |
| `import_texture_file` | Import texture from file |
| `search_components` | Search for components |
| `get_component_info` | Get component details |
| `list_categories` | List categories |
| `search_by_category` | Search by category |
| `search_by_member` | Search by member name |
| `get_component_source` | Get source code |
| `grep_source` | Full-text search source |

## Using as CLI

### Specifying WebSocket URL

The CLI determines the WebSocket URL in the following priority order:

1. Command line argument `--url` (highest priority)
2. Environment variable `RESONITELINK_URL`
3. Default value: `ws://localhost:29551`

**Example using environment variable:**

```bash
# Windows (PowerShell)
$env:RESONITELINK_URL = "ws://localhost:29469"

# Windows (Command Prompt)
set RESONITELINK_URL=ws://localhost:29469

# Linux/Mac
export RESONITELINK_URL=ws://localhost:29469
```

Setting the environment variable eliminates the need to specify the `--url` option every time.

### Basic Commands

```bash
# Get Root slot information
node dist/cli.js root --depth 1

# Get specific slot information
node dist/cli.js get-slot --id <slotId> --depth 1

# Include component information
node dist/cli.js get-slot --id <slotId> --components

# Search for slot by name
node dist/cli.js find --name MyObject

# Add a slot
node dist/cli.js add-slot --name NewSlot --position 0,1,0

# Add slot with parent specified
node dist/cli.js add-slot --parent <parentId> --name MySlot --position 0,1,0 --scale 1,1,1

# Add a component
node dist/cli.js add-component --slot <slotId> --type "[FrooxEngine]FrooxEngine.BoxMesh"

# Update a slot
node dist/cli.js update-slot --id <slotId> --name NewName --position 0,2,0

# Remove a slot
node dist/cli.js remove-slot --id <slotId>

# Get a component
node dist/cli.js get-component --id <componentId>

# Remove a component
node dist/cli.js remove-component --id <componentId>

# Display slot hierarchy as tree
node dist/cli.js tree --depth 3

# Specify WebSocket URL (for different ports)
node dist/cli.js root --url ws://localhost:9422 --depth 2
```

## Using as Library

```typescript
import { ResoniteLinkClient } from './src/index.js';

const client = new ResoniteLinkClient({ url: 'ws://localhost:29551' });
await client.connect();

// Add a slot
await client.addSlot({ name: 'MyObject', position: { x: 0, y: 1, z: 0 } });

// Add a component
await client.addComponent({
  containerSlotId: slotId,
  componentType: '[FrooxEngine]FrooxEngine.BoxMesh'
});

client.disconnect();
```

### Client Options

```typescript
const client = new ResoniteLinkClient({
  url: 'ws://localhost:29551',  // WebSocket URL (required)
  debug: true,                   // Output logs to console
  logFile: 'debug.log',          // Output logs to file
  requestTimeout: 30000,         // Request timeout (milliseconds, default: 30000)
  autoReconnect: false,          // Auto reconnect
  reconnectInterval: 5000,       // Reconnect interval (milliseconds)
});
```

### Debug Logging

If issues occur, enabling debug logging allows you to check SEND/RECV messages:

```typescript
const client = new ResoniteLinkClient({
  url: 'ws://localhost:29551',
  debug: true,           // Console output
  logFile: 'debug.log',  // File output
});
```

Log example:
```
[2026-01-08T06:10:24.504Z] SEND: { "$type": "addSlot", "messageId": "..." }
[2026-01-08T06:10:24.506Z] RECV: { "success": true, "messageId": "...", "error": null }
```

### Request Timeout

When no response is returned (e.g., when sending malformed data), a timeout error occurs:

```typescript
const client = new ResoniteLinkClient({
  url: 'ws://localhost:29551',
  requestTimeout: 10000,  // Timeout after 10 seconds
});
```

When a timeout occurs, an error like `Error: Request timeout after 10000ms: updateComponent (...)` is thrown.

### Texture Import

You can import textures using the ResoniteLink asset import API.

#### Import from File

```typescript
// Import texture from local file on Resonite host
const result = await client.importTexture2DFile({
  filePath: 'C:/path/to/texture.png'
});

if (result.success) {
  console.log('Asset URL:', result.assetURL);
  // assetURL can be set to StaticTexture2D, etc.
}
```

#### Import from Raw Data

```typescript
// Import texture from RGBA pixel data
const width = 256;
const height = 256;
const rawData = Buffer.alloc(width * height * 4); // RGBA, 4 bytes per pixel

// Generate pixel data (example: gradient)
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    rawData[offset] = x;         // R
    rawData[offset + 1] = y;     // G
    rawData[offset + 2] = 128;   // B
    rawData[offset + 3] = 255;   // A
  }
}

const result = await client.importTexture2DRawData({
  width,
  height,
  colorProfile: 'sRGB',  // 'sRGB' or 'Linear'
  rawData
});

if (result.success) {
  console.log('Asset URL:', result.assetURL);
}
```

#### Notes

- `filePath` is a local path on the host running Resonite
- `assetURL` is only valid within the session (temporary URL)
- Supported formats: PNG, JPG and other common image formats
- Raw data is in RGBA format (4 bytes per pixel)

## Important: World System Objects

Below the Root of a Resonite world, there are system objects that must not be deleted.

### Objects That Must Not Be Deleted

| Object Name | Description |
|-------------|-------------|
| `Controllers` | Controller input system |
| `Roles` | User role management |
| `SpawnArea` | User spawn location |
| `Light` | World lighting |
| `Skybox` | Sky/background |
| `User <...>` | Connected users (deleting kicks them) |
| `__TEMP` | Temporary object management |
| `Undo Manager` | Undo history |
| `Assets` | Shared assets |
| `Clipboard Importer` | Clipboard import functionality |

### Safe Deletion Method

```typescript
const SYSTEM_OBJECTS = [
  'Controllers', 'Roles', 'SpawnArea', 'Light', 'Skybox',
  '__TEMP', 'Undo Manager', 'Assets', 'Clipboard Importer'
];

// Skip system objects and Users
if (SYSTEM_OBJECTS.includes(name) || name.startsWith('User ')) {
  continue;
}
```

## Component Type Format

```
[FrooxEngine]FrooxEngine.ComponentName
```

### Commonly Used Components

| Component | Purpose |
|-----------|---------|
| `BoxMesh` | Box mesh |
| `SphereMesh` | Sphere mesh |
| `CylinderMesh` | Cylinder mesh |
| `ConeMesh` | Cone mesh |
| `BevelBoxMesh` | Rounded box |
| `RampMesh` | Ramp/slope |
| `FrameMesh` | Frame |
| `TorusMesh` | Torus |
| `CapsuleMesh` | Capsule |
| `MeshRenderer` | Mesh rendering |
| `PBS_Metallic` | PBR material |
| `Light` | Light |

### Material Configuration Example

```typescript
await client.updateComponent({
  id: materialId,
  members: {
    AlbedoColor: { $type: 'colorX', value: { r: 1, g: 0, b: 0, a: 1, profile: 'sRGB' } },
    Smoothness: { $type: 'float', value: 0.5 },
    Metallic: { $type: 'float', value: 0.2 },
  }
});
```

### Enum Type Configuration (BlendMode, LightType, etc.)

When updating enum type members, the following format must be used:

```typescript
{
  $type: 'enum',      // lowercase 'enum'
  value: 'Alpha',     // specify value as string (not number)
  enumType: 'BlendMode'  // enum type name
}
```

#### BlendMode Values

| Value | Description |
|-------|-------------|
| `Opaque` | Opaque (default) |
| `Cutout` | Cutout (alpha test) |
| `Alpha` | Translucent (alpha blend) |

#### Translucent Material Example

```typescript
await client.updateComponent({
  id: materialId,
  members: {
    BlendMode: { $type: 'enum', value: 'Alpha', enumType: 'BlendMode' },
    AlbedoColor: { $type: 'colorX', value: { r: 0.6, g: 0.75, b: 0.9, a: 0.3, profile: 'sRGB' } },
  }
});
```

#### LightType Values

| Value | Description |
|-------|-------------|
| `Directional` | Directional light |
| `Point` | Point light |
| `Spot` | Spot light |

```typescript
await client.updateComponent({
  id: lightId,
  members: {
    LightType: { $type: 'enum', value: 'Point', enumType: 'LightType' },
    Intensity: { $type: 'float', value: 2.0 },
    Range: { $type: 'float', value: 10.0 },
  }
});
```

#### Notes

- `$type` must be lowercase `'enum'` (not `'Enum'`)
- `value` is specified as string, not number
- May not work if `enumType` is omitted
- Sending incorrect format causes no response and timeout

### Member Type List

| $type | Description | Example |
|-------|-------------|---------|
| `float` | Floating point | `{ $type: 'float', value: 0.5 }` |
| `int` | Integer | `{ $type: 'int', value: 10 }` |
| `bool` | Boolean | `{ $type: 'bool', value: true }` |
| `float2` | 2D vector | `{ $type: 'float2', value: { x: 1, y: 1 } }` |
| `float3` | 3D vector | `{ $type: 'float3', value: { x: 1, y: 2, z: 3 } }` |
| `floatQ` | Quaternion | `{ $type: 'floatQ', value: { x: 0, y: 0, z: 0, w: 1 } }` |
| `colorX` | Color | `{ $type: 'colorX', value: { r: 1, g: 0, b: 0, a: 1, profile: 'sRGB' } }` |
| `enum` | Enumeration | `{ $type: 'enum', value: 'Alpha', enumType: 'BlendMode' }` |
| `reference` | Reference | `{ $type: 'reference', targetId: 'Reso_XXXXX' }` |
| `list` | List | `{ $type: 'list', elements: [...] }` |
| `empty` | Output member | `{ $type: 'empty', id: 'Reso_XXXXX' }` |

### empty Type (ProtoFlux Output Member)

With the ResoniteLink update, ProtoFlux node **output members** are now returned as `$type: "empty"`.

#### Background

ProtoFlux nodes have inputs (SyncRef) and outputs (NodeValueOutput):

- **Input**: Receives values (returned as reference type)
- **Output**: Outputs values (previously not returned → **now returned as empty type**)

#### Example: GlobalTransform Node

```json
{
  "componentType": "...GlobalTransform",
  "members": {
    "Instance": { "$type": "reference", "targetId": null, ... },
    "GlobalPosition": { "$type": "empty", "id": "Reso_82E" },
    "GlobalRotation": { "$type": "empty", "id": "Reso_82F" },
    "GlobalScale": { "$type": "empty", "id": "Reso_830" }
  }
}
```

#### How to Reference Output Members

You can use the output member's `id` to connect to other node inputs:

```typescript
// Get GlobalTransform's GlobalPosition output
const globalTransformComp = slotData.data?.components?.find(c =>
  c.componentType?.includes('GlobalTransform')
);
const globalPositionId = globalTransformComp.members.GlobalPosition.id; // "Reso_82E"

// Connect GlobalPosition to ValueSub's A input
await client.updateComponent({
  id: subComp.id,
  members: {
    A: { $type: 'reference', targetId: globalPositionId },  // Directly reference output ID!
  }
});
```

#### Differences from Before

| Item | Before | Now |
|------|--------|-----|
| Output members | Not included in JSON | Returned as `$type: "empty"` |
| Referencing multi-output nodes | Reference entire component ID → Error | Reference output IDs individually → Success |

This allows nodes with multiple outputs like GlobalTransform to be connected correctly.

### Updating Materials List (Two Steps)

Updating MeshRenderer's Materials list requires a two-step operation.

#### Why Two Steps Are Required

Due to ResoniteLink limitations, setting references to list elements behaves as follows:

1. **First update**: New element is added to list, but `targetId` **becomes null**
2. **Second update**: By specifying the element's `id`, you can set the `targetId` of the existing element

This means adding elements and setting references must be done as separate operations.

#### Code Example

```typescript
// 1. First add element to list (at this point targetId becomes null)
await client.updateComponent({
  id: rendererId,
  members: {
    Materials: {
      $type: 'list',
      elements: [{ $type: 'reference', targetId: materialId }]
    }
  }
});

// 2. Get the added element's ID
const rendererData = await client.getComponent(rendererId);
const elementId = rendererData.data.members.Materials.elements[0].id;

// 3. Specify element ID and set reference
await client.updateComponent({
  id: rendererId,
  members: {
    Materials: {
      $type: 'list',
      elements: [{ $type: 'reference', id: elementId, targetId: materialId }]
    }
  }
});
```

#### Important Points

- Omitting `id` field adds a new element (existing elements are not updated)
- Specifying `id` field updates the existing element with that ID
- Even if `targetId` is specified the first time, it gets ignored and becomes null

## Adding ProtoFlux Components

Adding ProtoFlux nodes (generic type components) requires a specific format.

### Correct Format

```
[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.<ComponentName><Type>
```

#### Key Points

| Item | Correct Format | Wrong Format |
|------|----------------|--------------|
| Assembly name | `[ProtoFluxBindings]` | `[FrooxEngine]` |
| Namespace | `FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes` | `FrooxEngine.ProtoFlux.CoreNodes` |
| Generic type | `<bool>`, `<int>`, `<float>` | `<System.Boolean>`, `` `1[System.Boolean] `` |

- **Namespace**: `FrooxEngine` is repeated twice
- **Type specification**: Use C# aliases (`bool`, `int`, `float`), not `System.Boolean`
- **Notation**: Use `<>` format, not .NET's backtick notation `` `1[...] ``

#### Complex Type Parameters (Slot, User, etc.)

When using complex types like Slot or User as type parameters, use **fully qualified names with assembly name**:

```
[ProtoFluxBindings]...RefObjectInput<[FrooxEngine]FrooxEngine.Slot>
```

| Type | Correct Format | Wrong Format |
|------|----------------|--------------|
| Slot | `<[FrooxEngine]FrooxEngine.Slot>` | `<Slot>`, `<FrooxEngine.Slot>` |
| User | `<[FrooxEngine]FrooxEngine.User>` | `<User>` |
| IButton | `<[FrooxEngine]FrooxEngine.IButton>` | `<IButton>` |

**Important**: Use aliases as-is for primitive types (`int`, `float`, `bool`, etc.), and use `[FrooxEngine]FrooxEngine.TypeName` format for complex types (`Slot`, `User`, etc.).

### Verified Components

| Node | componentType |
|------|---------------|
| ValueInput\<int\> | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<int>` |
| ValueAdd\<int\> | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueAdd<int>` |
| ValueDisplay\<int\> | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueDisplay<int>` |
| WorldTimeFloat | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Time.WorldTimeFloat` |
| AxisAngle_floatQ | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Math.Quaternions.AxisAngle_floatQ` |
| HSV_ToColorX | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Color.HSV_ToColorX` |
| ValueFieldDrive\<floatQ\> | `[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueFieldDrive<floatQ>` |
| ValueFieldDrive\<colorX\> | `[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueFieldDrive<colorX>` |
| ValueFieldDrive\<bool\> | `[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueFieldDrive<bool>` |

### Code Example

```typescript
// Add ValueFieldDrive<floatQ> (for rotation drive)
await client.addComponent({
  containerSlotId: slotId,
  componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueFieldDrive<floatQ>'
});

// Add WorldTimeFloat (for getting time)
await client.addComponent({
  containerSlotId: slotId,
  componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Time.WorldTimeFloat'
});

// Add HSV_ToColorX (for color conversion)
await client.addComponent({
  containerSlotId: slotId,
  componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Color.HSV_ToColorX'
});
```

### Connecting ProtoFlux Nodes

```typescript
// Connect ValueInput nodes to ValueAdd's A, B inputs
await client.updateComponent({
  id: addCompId,
  members: {
    A: { $type: 'reference', targetId: input1CompId },
    B: { $type: 'reference', targetId: input2CompId },
  }
});

// Connect ValueAdd's output to ValueDisplay's Input
await client.updateComponent({
  id: displayCompId,
  members: {
    Input: { $type: 'reference', targetId: addCompId },
  }
});
```

### Commonly Used ProtoFlux Nodes

| Component | Purpose |
|-----------|---------|
| `ValueFieldDrive<T>` | Drive a field |
| `ReferenceFieldDrive<T>` | Drive a reference field |
| `GlobalValue<T>` | Global value |
| `GlobalReference<T>` | Global reference |

### ProtoFlux Node Placement

When adding ProtoFlux nodes, placing each node in separate slots and arranging them at appropriate positions improves visibility.

#### Coordinate System

Resonite's coordinate system:
- **X-axis**: Left/Right (right is positive)
- **Y-axis**: Up/Down (up is positive)
- **Z-axis**: Front/Back (front is positive)

ProtoFlux nodes are typically placed **from left to right (X-axis direction)**.

#### Basic Placement Pattern

```
Left ────────────────────────────────────────────→ Right (X-axis)

[Input Nodes]  →  [Processing Node]  →  [Output Node]  →  [Drive Node]
   x=-1.5            x=-1.0              x=-0.5            x=0
```

#### When There Are Multiple Inputs

Offset vertically on Y-axis:

```typescript
// Input 1 (upper)
await client.addSlot({ name: 'Input1', position: { x: -1.5, y: 0.15, z: 0 } });

// Input 2 (lower)
await client.addSlot({ name: 'Input2', position: { x: -1.5, y: -0.15, z: 0 } });

// Processing node (center)
await client.addSlot({ name: 'Process', position: { x: -1.0, y: 0, z: 0 } });
```

#### Practical Example: Rotating Box

```typescript
// Parent slot
const fluxSlot = await client.addSlot({ name: 'Flux', position: { x: 0, y: 2, z: 0 } });

// Arrange each node from left to right
const nodes = [
  { name: 'AxisInput',      x: -0.6, y: 0.15 },  // Rotation axis input
  { name: 'TimeNode',       x: -0.6, y: -0.15 }, // Time getter
  { name: 'AxisAngleNode',  x: -0.3, y: 0 },     // Axis angle → quaternion conversion
  { name: 'DriveNode',      x: 0,    y: 0 },     // Rotation drive
];

for (const node of nodes) {
  await client.addSlot({
    name: node.name,
    parentId: fluxSlot.data.id,
    position: { x: node.x, y: node.y, z: 0 }
  });
}
```

#### Placement Tips

| Item | Recommended Value |
|------|-------------------|
| Horizontal spacing between nodes | 0.3 to 0.5 |
| Vertical spacing for branches | 0.15 to 0.3 |
| Relative coordinates from parent slot | Use |

- Create a parent slot (e.g., `Flux`) and place each node under it
- Positions become relative coordinates from the parent slot
- Arrange so data flow goes from left to right
- If there are branches, offset on Y-axis

### Limitations

Some ProtoFlux nodes cannot be added:
- Nodes with complex generic constraints
- Nodes requiring special initialization

Workarounds:
- Create ProtoFlux manually in Resonite
- Duplicate existing ProtoFlux as a template
- Import saved PackedObjects

## Decompile Search (CLI)

```bash
# Search by component name
node dist/cli.js search --query Mesh

# Display component details
node dist/cli.js info --name PBS_Metallic

# List categories
node dist/cli.js categories

# Search by category
node dist/cli.js category --query "Materials"

# Search by member name
node dist/cli.js member --query Smoothness

# Full-text search source code
node dist/cli.js grep --query "SyncPlayback"

# Display source code
node dist/cli.js source --name BoxMesh
```

## Sample Scripts

```bash
# Create ProtoFlux 1+1 (ValueInput → ValueAdd → ValueDisplay)
node dist/scripts/create-flux-add.js ws://localhost:58971

# Create Tokyo Tower (detailed version)
node dist/scripts/create-tokyo-tower-detailed.js ws://localhost:58971

# Create Tokyo Skytree
node dist/scripts/create-skytree.js ws://localhost:58971

# Delete Tokyo Tower
node dist/scripts/delete-tokyo-tower.js ws://localhost:58971

# Create modern house (with interior)
node dist/scripts/create-house3.js

# Create town
node dist/scripts/create-town.js

# Create clouds
node dist/scripts/create-clouds.js

# Delete everything and leave only the floor
node dist/scripts/reset-to-floor.js
```

## License

MIT
