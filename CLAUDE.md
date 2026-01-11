# ResoLink MCP Development Guidelines

## Work Policy

### When to Use MCP (Research & Testing)
- Investigating component type names and formats
- Checking existing slot/component structures
- Testing single component behavior
- Testing ProtoFlux node connections
- Lightweight experimentation and prototyping

### When to Use Scripts (Production Builds)
- Batch creation of multiple slots/components
- Building finished products
- Generating repeated patterns
- Creating large hierarchical structures

**Reason**: Attaching components one by one via MCP consumes a lot of context, so once research is complete, production builds should be executed in batch using scripts.

---

## Component Type Format

### Basic Components (FrooxEngine)
```
[FrooxEngine]FrooxEngine.<ComponentName>
```
Examples:
- `[FrooxEngine]FrooxEngine.BoxMesh`
- `[FrooxEngine]FrooxEngine.SphereMesh`
- `[FrooxEngine]FrooxEngine.MeshRenderer`
- `[FrooxEngine]FrooxEngine.PBS_Metallic`

### ProtoFlux Nodes
```
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.<Category>.<NodeName>
```
Examples:
- `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Time.WorldTimeFloat`
- `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Color.HSV_ToColorX`

### Generic Types (ProtoFlux)
Can be added if specified in the correct format:
```
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<int>
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueAdd<int>
[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueFieldDrive<colorX>
```

**Key Points**:
- `[ProtoFluxBindings]` prefix is required
- Use C# aliases for primitive types (`int`, `float`, `bool`, `colorX`)
- Use `<>` notation (backtick notation `` `1[...] `` is not supported)

### Object Type Generic Parameters

When using object types like `Slot` or `User` as generic parameters, **the type parameter also requires an assembly-qualified name**:
```
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.Slot>
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.User>
```

**Format**: `<[Assembly]Namespace.Type>`

---

## Verified Components

| Category | Component | Type Format |
|----------|-----------|-------------|
| Mesh | BoxMesh | `[FrooxEngine]FrooxEngine.BoxMesh` |
| Mesh | SphereMesh | `[FrooxEngine]FrooxEngine.SphereMesh` |
| Rendering | MeshRenderer | `[FrooxEngine]FrooxEngine.MeshRenderer` |
| Material | PBS_Metallic | `[FrooxEngine]FrooxEngine.PBS_Metallic` |
| Animation | Wiggler | `[FrooxEngine]FrooxEngine.Wiggler` |
| ProtoFlux | WorldTimeFloat | `[ProtoFluxBindings]...Time.WorldTimeFloat` |
| ProtoFlux | HSV_ToColorX | `[ProtoFluxBindings]...Color.HSV_ToColorX` |
| ProtoFlux | ValueInput\<int\> | `[ProtoFluxBindings]...ValueInput<int>` |
| ProtoFlux | ValueAdd\<int\> | `[ProtoFluxBindings]...Operators.ValueAdd<int>` |
| ProtoFlux | ValueDisplay\<int\> | `[ProtoFluxBindings]...ValueDisplay<int>` |
| ProtoFlux | ValueFieldDrive\<colorX\> | `[ProtoFluxBindings]...ValueFieldDrive<colorX>` |
| ProtoFlux | FieldDriveBase+Proxy | `FrooxEngine.ProtoFlux.CoreNodes.FieldDriveBase<colorX>+Proxy` |
| ProtoFlux | RefObjectInput\<Slot\> | `[ProtoFluxBindings]...RefObjectInput<[FrooxEngine]FrooxEngine.Slot>` |
| ProtoFlux | DynamicImpulseReceiver | `[ProtoFluxBindings]...Actions.DynamicImpulseReceiver` |
| ProtoFlux | DuplicateSlot | `[ProtoFluxBindings]...FrooxEngine.Slots.DuplicateSlot` |
| ProtoFlux | ObjectFieldDrive\<string\> | `[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectFieldDrive<string>` |
| ProtoFlux | FieldDriveBase+Proxy | Auto-generated when ObjectFieldDrive is added. Drive member is located here |
| UIX | Canvas | `[FrooxEngine]FrooxEngine.UIX.Canvas` |
| UIX | RectTransform | `[FrooxEngine]FrooxEngine.UIX.RectTransform` |
| UIX | Text | `[FrooxEngine]FrooxEngine.UIX.Text` |
| UIX | Image | `[FrooxEngine]FrooxEngine.UIX.Image` |
| UIX | Button | `[FrooxEngine]FrooxEngine.UIX.Button` |
| UIX | TextField | `[FrooxEngine]FrooxEngine.UIX.TextField` |
| UIX | VerticalLayout | `[FrooxEngine]FrooxEngine.UIX.VerticalLayout` |
| UIX | HorizontalLayout | `[FrooxEngine]FrooxEngine.UIX.HorizontalLayout` |
| UIX | LayoutElement | `[FrooxEngine]FrooxEngine.UIX.LayoutElement` |
| Material | UI_UnlitMaterial | `[FrooxEngine]FrooxEngine.UI_UnlitMaterial` |
| Interaction | Grabbable | `[FrooxEngine]FrooxEngine.Grabbable` |
| Interaction | ButtonDynamicImpulseTrigger | `[FrooxEngine]FrooxEngine.ButtonDynamicImpulseTrigger` |
| Interaction | PhysicalButton | `[FrooxEngine]FrooxEngine.PhysicalButton` |
| Interaction | BoxCollider | `[FrooxEngine]FrooxEngine.BoxCollider` |
| ProtoFlux | GlobalReference\<IButton\> | `[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IButton>` |
| ProtoFlux | ButtonEvents | `[ProtoFluxBindings]...FrooxEngine.Interaction.ButtonEvents` |
| ProtoFlux | StartAsyncTask | `[ProtoFluxBindings]...FrooxEngine.Async.StartAsyncTask` |
| ProtoFlux | GET_String | `[ProtoFluxBindings]...FrooxEngine.Network.GET_String` |
| ProtoFlux | StringToAbsoluteURI | `[ProtoFluxBindings]...Utility.Uris.StringToAbsoluteURI` |
| ProtoFlux | DataModelObjectFieldStore\<string\> | `[ProtoFluxBindings]...FrooxEngine.Variables.DataModelObjectFieldStore<string>` |
| ProtoFlux | ValueObjectInput\<string\> | `[ProtoFluxBindings]...ValueObjectInput<string>` |
| ProtoFlux | ObjectWrite\<string\> | `[ProtoFluxBindings]...ObjectWrite<string>` |
| ProtoFlux | If | `[ProtoFluxBindings]...If` |
| ProtoFlux | ValueInput\<bool\> | `[ProtoFluxBindings]...ValueInput<bool>` |
| ProtoFlux | ObjectConditional\<string\> | `[ProtoFluxBindings]...ObjectConditional<string>` |
| ProtoFlux | ObjectEquals\<string\> | `[ProtoFluxBindings]...ObjectEquals<string>` |
| ProtoFlux | ValueWrite\<bool\> | `[ProtoFluxBindings]...ValueWrite<bool>` |
| ProtoFlux | NOT_Bool | `[ProtoFluxBindings]...Operators.NOT_Bool` |
| ProtoFlux | GlobalValue\<string\> | `[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>` - Implements IGlobalValueProxy, required for DynamicImpulseReceiver.Tag |
| ProtoFlux | ObjectValueSource\<string\> | `[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>` - Implements IVariable |
| ProtoFlux | ValueSource\<bool\> | `[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>` - Implements IVariable |
| ProtoFlux | GlobalReference\<IValue\<T\>\> | `[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>` |
| ProtoFlux | ObjectWrite (FrooxEngineContext) | `[ProtoFluxBindings]...ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>` |
| ProtoFlux | ValueWrite (FrooxEngineContext) | `[ProtoFluxBindings]...ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>` |
| Relations | ValueDriver\<T\> | `[FrooxEngine]FrooxEngine.ValueDriver<T>` - ValueSource/DriveTarget members |

---

## Building UIX

### Important: Scale Settings

UIX operates in pixel units, so **the UIX root slot scale must be set to 0.001**:

```typescript
await client.updateSlot({
  id: mainId,
  scale: { x: 0.001, y: 0.001, z: 0.001 },
});
```

### UIX Component Namespace

UIX components are in the `FrooxEngine.UIX` namespace (not `FrooxEngine`):

```
[FrooxEngine]FrooxEngine.UIX.<ComponentName>
```

### Basic UIX Structure

```
Root (scale: 0.001)
├── Canvas
├── Grabbable (if you want it to be grabbable and movable)
└── Background
    ├── RectTransform (AnchorMin/Max: 0,0 ~ 1,1)
    └── Image (background color)
└── Content
    ├── RectTransform
    ├── VerticalLayout / HorizontalLayout
    └── Child elements...
```

### Important: Image and Text Z-Fighting Issue

**Placing Image and Text in the same slot causes Z-fighting and makes them invisible.**

To create text with a background color, **you need to separate them into different slots**:

```
❌ Wrong (Z-fighting occurs)
TextSlot
├── RectTransform
├── Image (background)
└── Text (text)  ← Becomes invisible

✅ Correct (separate into different slots)
BackgroundSlot
├── RectTransform
└── Image (background)
TextSlot (child of BackgroundSlot)
├── RectTransform
└── Text (text)
```

Alternatively, place the Image in the parent slot and the Text in a child slot.

### Important: Image Requires UI_UnlitMaterial

**If the Image component's Material is not set, the Unlit rendering order is not processed correctly and display becomes corrupted.**

When using UIX Image, **you need to create a UI_UnlitMaterial and set it to Image.Material**:

```typescript
// 1. Add UI_UnlitMaterial to the UIX root
await client.addComponent({
  containerSlotId: uixRootId,
  componentType: '[FrooxEngine]FrooxEngine.UI_UnlitMaterial',
});

// 2. Get the component ID
const uixRootData = await client.getSlot({ slotId: uixRootId, includeComponentData: true });
const uiMaterial = uixRootData.data?.components?.find((c: any) =>
  c.componentType?.includes('UI_UnlitMaterial')
);

// 3. Configure UI_UnlitMaterial (Important: these values ensure correct rendering order)
await client.updateComponent({
  id: uiMaterial.id,
  members: {
    ZWrite: { $type: 'enum', value: 'On', enumType: 'ZWrite' },
    OffsetFactor: { $type: 'float', value: 1 },
    OffsetUnits: { $type: 'float', value: 100 },
    Sidedness: { $type: 'enum', value: 'Double', enumType: 'Sidedness' },
  } as any,
});

// 4. Set to Image.Material
await client.updateComponent({
  id: imageId,
  members: {
    Tint: { $type: 'colorX', value: { r: 0.2, g: 0.2, b: 0.25, a: 1 } },
    Material: { $type: 'reference', targetId: uiMaterial?.id },
  } as any,
});
```

**Key Points**:
- Create one UI_UnlitMaterial at the UIX root
- Set Material only on **the background Image** (child Images can be null)
- **Required settings**: `ZWrite: On`, `OffsetFactor: 1`, `OffsetUnits: 100`, `Sidedness: Double`

### UIX Component Configuration Examples

```typescript
// Canvas
await client.updateComponent({
  id: canvasId,
  members: {
    Size: { $type: 'float2', value: { x: 400, y: 500 } },
  } as any,
});

// RectTransform (full screen)
await client.updateComponent({
  id: rectId,
  members: {
    AnchorMin: { $type: 'float2', value: { x: 0, y: 0 } },
    AnchorMax: { $type: 'float2', value: { x: 1, y: 1 } },
    OffsetMin: { $type: 'float2', value: { x: 0, y: 0 } },
    OffsetMax: { $type: 'float2', value: { x: 0, y: 0 } },
  } as any,
});

// Image (color setting)
await client.updateComponent({
  id: imageId,
  members: {
    Tint: { $type: 'colorX', value: { r: 0.2, g: 0.2, b: 0.25, a: 1 } },
  } as any,
});

// Text
await client.updateComponent({
  id: textId,
  members: {
    Content: { $type: 'string', value: 'Hello' },
    Size: { $type: 'float', value: 24 },
    Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
  } as any,
});

// LayoutElement
await client.updateComponent({
  id: layoutId,
  members: {
    PreferredHeight: { $type: 'float', value: 50 },
    FlexibleWidth: { $type: 'float', value: 1 },
  } as any,
});

// VerticalLayout / HorizontalLayout
await client.updateComponent({
  id: layoutId,
  members: {
    Spacing: { $type: 'float', value: 10 },
    PaddingTop: { $type: 'float', value: 10 },
    PaddingBottom: { $type: 'float', value: 10 },
    PaddingLeft: { $type: 'float', value: 10 },
    PaddingRight: { $type: 'float', value: 10 },
    ForceExpandWidth: { $type: 'bool', value: true },
    ForceExpandHeight: { $type: 'bool', value: false },
  } as any,
});
```

### UIX Enum Field Configuration

Enum type fields like `HorizontalAlign`, `VerticalAlign` can be set using `$type: 'enum'`:

```typescript
await client.updateComponent({
  id: textId,
  members: {
    HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
    VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
  } as any,
});
```

**Format**:
```typescript
{ $type: 'enum', value: 'value name', enumType: 'Enum type name' }
```

### UIX Notes

- Attaching TextField automatically attaches TextEditor as well

### Reference Scripts

- `create-todo-list.ts` - Complete implementation example of UIX TODO list

---

## Recommended Script Building Flow

1. **Research Phase** (MCP)
   - Search for type names with `search_components`
   - Check details with `get_component_info`
   - Reference existing structures with `get_slot`
   - Test with single components

2. **Design Phase**
   - Design the required slot hierarchy
   - List out components
   - Organize connection relationships

3. **Build Phase** (Script)
   - Create slots in batch
   - Add components in batch
   - Set references in batch

---

## How to Write Scripts

### File Location
Create TypeScript files in `src/scripts/`

### Execution
```bash
npx tsx src/scripts/<script-name>.ts [ws://localhost:29551]
```

### Basic Template
```typescript
import { ResoniteLinkClient } from '../index.js';

async function main() {
  const url = process.argv[2] || 'ws://localhost:29551';
  const client = new ResoniteLinkClient({ url });
  await client.connect();

  try {
    // 1. Create slot
    await client.addSlot({
      name: 'MyObject',
      position: { x: 0, y: 1, z: 0 },
      isActive: true,
    });

    // 2. Get slot ID
    const slot = await client.findSlotByName('MyObject', 'Root', 1);
    if (!slot?.id) throw new Error('Slot not found');

    // 3. Add component
    await client.addComponent({
      containerSlotId: slot.id,
      componentType: '[FrooxEngine]FrooxEngine.SphereMesh',
    });

    // 4. Get component info
    const slotData = await client.getSlot({
      slotId: slot.id,
      depth: 0,
      includeComponentData: true,
    });
    const mesh = slotData.data.components?.find(c =>
      c.componentType?.includes('SphereMesh')
    );

    // 5. Update component
    await client.updateComponent({
      id: mesh.id!,
      members: {
        Radius: { $type: 'float', value: 0.5 },
      } as any,
    });

  } finally {
    client.disconnect();
  }
}

main();
```

### Reference Scripts
- `create-snowman.ts` - Helper function pattern for part creation
- `colorful.ts` - Simple color change
- `create-house.ts` - Hierarchical structure building
- `create-flux-add.ts` - ProtoFlux 1+1 creation example
- `create-weather-widget.ts` - Complete implementation example with UIX + PhysicalButton + HTTP GET
- `create-weather-flux.ts` - Weather fetching ProtoFlux implementation example
- `create-tictactoe-complete.ts` - UIX + ProtoFlux fully functional Tic-Tac-Toe game

---

## How to Write ProtoFlux Scripts

### Important: Slot Configuration Rules

**One ProtoFlux component per slot**

- Don't mix ProtoFlux nodes with other components (UIX, Mesh, etc.)
- Create a parent slot called "Flux" and place ProtoFlux slots under it

```
MyObject (Grabbable)
├── Flux (ProtoFlux parent slot)
│   ├── Input1 (ValueInput<int>)
│   ├── Input2 (ValueInput<int>)
│   ├── Add (ValueAdd<int>)
│   └── Display (ValueDisplay<int>)
├── Button (BoxMesh, MeshRenderer, PBS_Metallic, BoxCollider, PhysicalButton)
└── UIX (Canvas, RectTransform, Text)
```

### Basic Pattern

```typescript
// 1. Create parent slot (unique name recommended)
const slotName = `Flux_${Date.now()}`;
await client.addSlot({ name: slotName, position: { x: 0, y: 1.5, z: 2 } });
const container = await client.findSlotByName(slotName, 'Root', 1);

// 2. Create child slots (for each node)
await client.addSlot({ parentId: container.id, name: 'Input1', position: { x: -0.3, y: 0.1, z: 0 } });
await client.addSlot({ parentId: container.id, name: 'Add', position: { x: 0, y: 0, z: 0 } });

// 3. Get child slot IDs from parent
const containerData = await client.getSlot({ slotId: container.id, depth: 1 });
const input1Slot = containerData.data?.children?.find(c => c.name?.value === 'Input1');

// 4. Add ProtoFlux component
await client.addComponent({
  containerSlotId: input1Slot.id,
  componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<int>',
});

// 5. Get component ID
const slotData = await client.getSlot({ slotId: input1Slot.id, includeComponentData: true });
const inputComp = slotData.data?.components?.find(c => c.componentType?.includes('ValueInput'));

// 6. Set values and connections
await client.updateComponent({
  id: inputComp.id,
  members: { Value: { $type: 'int', value: 1 } } as any,
});
```

### ProtoFlux Node Connections

| Node | Input Members | Output |
|------|---------------|--------|
| ValueInput\<T\> | Value (value setting) | Self is INodeValueOutput |
| ValueAdd\<T\> | A, B (reference) | Self is INodeValueOutput |
| ValueDisplay\<T\> | Input (reference) | None (display only) |
| HSV_ToColorX | H, S, V (reference) | Self is INodeValueOutput |
| ValueFieldDrive\<T\> | Value (reference) | Drive (drives field) |

### How to Write Connections

```typescript
// Connect input nodes to ValueAdd's A, B
await client.updateComponent({
  id: addComp.id,
  members: {
    A: { $type: 'reference', targetId: input1Comp.id },
    B: { $type: 'reference', targetId: input2Comp.id },
  } as any,
});

// Connect calculation node to ValueDisplay's Input
await client.updateComponent({
  id: displayComp.id,
  members: {
    Input: { $type: 'reference', targetId: addComp.id },
  } as any,
});
```

### Connecting ButtonEvents and PhysicalButton

To connect a ButtonEvents node to a PhysicalButton, you need to go through **GlobalReference\<IButton\>**.

```
PhysicalButton ← GlobalReference<IButton>.Reference
                        ↑
ButtonEvents.Button ────┘
```

```typescript
// 1. Add GlobalReference<IButton>
await client.addComponent({
  containerSlotId: globalRefSlot.id,
  componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IButton>',
});

// 2. Add ButtonEvents
await client.addComponent({
  containerSlotId: buttonEventsSlot.id,
  componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Interaction.ButtonEvents',
});

// 3. GlobalReference.Reference → PhysicalButton
await client.updateComponent({
  id: globalRefComp.id,
  members: {
    Reference: { $type: 'reference', targetId: physicalButton.id },
  } as any,
});

// 4. ButtonEvents.Button → GlobalReference
await client.updateComponent({
  id: buttonEventsComp.id,
  members: {
    Button: { $type: 'reference', targetId: globalRefComp.id },
  } as any,
});

// 5. ButtonEvents.Pressed → next node (e.g., StartAsyncTask)
await client.updateComponent({
  id: buttonEventsComp.id,
  members: {
    Pressed: { $type: 'reference', targetId: startAsyncComp.id },
  } as any,
});
```

**Key Points**:
- ButtonEvents.Button expects an `IButton` interface
- PhysicalButton cannot be connected directly (requires GlobalReference)
- GlobalReference\<IButton\> bridges PhysicalButton and ButtonEvents

### Referencing Output Members (empty type)

With the ResoniteLink update, ProtoFlux node **output members** are now returned as `$type: "empty"`.

#### Connecting Multi-Output Nodes (GlobalTransform, etc.)

```typescript
// 1. Get component info
const slotData = await client.getSlot({ slotId, includeComponentData: true });
const globalTransform = slotData.data?.components?.find(c =>
  c.componentType?.includes('GlobalTransform')
);

// 2. Get output member IDs (empty type)
const globalPositionId = globalTransform.members.GlobalPosition.id;  // "Reso_XXX"
const globalRotationId = globalTransform.members.GlobalRotation.id;
const globalScaleId = globalTransform.members.GlobalScale.id;

// 3. Connect by directly referencing output ID
await client.updateComponent({
  id: subComp.id,
  members: {
    A: { $type: 'reference', targetId: globalPositionId },  // Reference output ID
  } as any,
});
```

#### Single-Output Nodes vs Multi-Output Nodes

| Node Type | Connection Method |
|-----------|-------------------|
| Single output (ValueInput, ValueAdd, etc.) | Directly reference component ID |
| Multi-output (GlobalTransform, etc.) | Reference each output member ID individually |

### ObjectFieldDrive Connection (Field Driving)

When adding ObjectFieldDrive<T>, a `FieldDriveBase<T>+Proxy` component is **auto-generated**.
The Drive member is on the **Proxy side**.

```typescript
// 1. Add ObjectFieldDrive
await client.addComponent({
  containerSlotId: fieldDriveSlot.id,
  componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectFieldDrive<string>',
});

// 2. Get components (both ObjectFieldDrive and Proxy exist)
const slotData = await client.getSlot({ slotId: fieldDriveSlot.id, includeComponentData: true });
const fieldDriveComp = slotData.data?.components?.find(c => c.componentType?.includes('ObjectFieldDrive'));
const proxyComp = slotData.data?.components?.find(c => c.componentType?.includes('Proxy'));

// 3. Connect Value input (ObjectFieldDrive side)
await client.updateComponent({
  id: fieldDriveComp.id,
  members: { Value: { $type: 'reference', targetId: sourceComp.id } } as any,
});

// 4. Connect Drive output (Proxy side)
const textDetails = await client.getComponent(textComp.id);
const contentFieldId = textDetails.data.members.Content.id;  // ID of field to drive

const proxyDetails = await client.getComponent(proxyComp.id);
const driveId = proxyDetails.data.members.Drive.id;

await client.updateComponent({
  id: proxyComp.id,
  members: { Drive: { $type: 'reference', id: driveId, targetId: contentFieldId } } as any,
});
```

### ObjectFieldDrive+Proxy Timing Issue

If you set the Proxy's Drive reference immediately after adding ObjectFieldDrive, **the reference may not be set correctly** (timing-dependent and unstable).

**Solution**: Wait a bit after adding the component, then re-fetch component info and set the reference.

```typescript
// 1. Add ObjectFieldDrive
await client.addComponent({ ... });

// 2. Wait a bit and re-fetch component info
await new Promise(resolve => setTimeout(resolve, 100));
const slotDataRefresh = await client.getSlot({ slotId, includeComponentData: true });
const proxyCompRefresh = slotDataRefresh.data?.components?.find(c => c.componentType?.includes('Proxy'));

// 3. Set Drive reference using the re-fetched Proxy component
const proxyDetails = await client.getComponent(proxyCompRefresh.id);
const driveId = proxyDetails.data.members.Drive?.id;

await client.updateComponent({
  id: proxyCompRefresh.id,
  members: { Drive: { $type: 'reference', id: driveId, targetId: targetFieldId } } as any,
});
```

**Key Points**:
- Add a delay of about 100ms
- Re-fetch with `getSlot` specifying `includeComponentData: true`
- Set reference using the re-fetched component ID

---

## Member Type List

| $type | Description | Example |
|-------|-------------|---------|
| `float` | Floating point | `{ $type: 'float', value: 0.5 }` |
| `int` | Integer | `{ $type: 'int', value: 10 }` |
| `bool` | Boolean | `{ $type: 'bool', value: true }` |
| `string` | String | `{ $type: 'string', value: 'text' }` |
| `float2` | 2D vector | `{ $type: 'float2', value: { x: 1, y: 1 } }` |
| `float3` | 3D vector | `{ $type: 'float3', value: { x: 1, y: 2, z: 3 } }` |
| `floatQ` | Quaternion | `{ $type: 'floatQ', value: { x: 0, y: 0, z: 0, w: 1 } }` |
| `colorX` | Color | `{ $type: 'colorX', value: { r: 1, g: 0, b: 0, a: 1, profile: 'sRGB' } }` |
| `enum` | Enumeration | `{ $type: 'enum', value: 'Alpha', enumType: 'BlendMode' }` |
| `reference` | Reference | `{ $type: 'reference', targetId: 'Reso_XXXXX' }` |
| `list` | List | `{ $type: 'list', elements: [...] }` |
| `empty` | Output member (read-only) | `{ $type: 'empty', id: 'Reso_XXXXX' }` |

---

## Enum Type Configuration

### Basic Format

```typescript
{ $type: 'enum', value: 'value name', enumType: 'Enum type name' }
```

**Notes**:
- `$type` must be lowercase `'enum'`
- `value` is specified as a string, not a number
- May not work if `enumType` is omitted

### Commonly Used Enums

#### BlendMode
| Value | Description |
|-------|-------------|
| `Opaque` | Opaque (default) |
| `Cutout` | Cutout (alpha test) |
| `Alpha` | Translucent (alpha blend) |

```typescript
BlendMode: { $type: 'enum', value: 'Alpha', enumType: 'BlendMode' }
```

#### LightType
| Value | Description |
|-------|-------------|
| `Directional` | Directional light |
| `Point` | Point light |
| `Spot` | Spot light |

```typescript
LightType: { $type: 'enum', value: 'Point', enumType: 'LightType' }
```

#### UIX TextAlignment
| Enum Type Name | Values |
|----------------|--------|
| `TextHorizontalAlignment` | `Left`, `Center`, `Right` |
| `TextVerticalAlignment` | `Top`, `Middle`, `Bottom` |

---

## Material Configuration

### PBS_Metallic Example

```typescript
await client.updateComponent({
  id: materialId,
  members: {
    AlbedoColor: { $type: 'colorX', value: { r: 1, g: 0, b: 0, a: 1, profile: 'sRGB' } },
    Smoothness: { $type: 'float', value: 0.5 },
    Metallic: { $type: 'float', value: 0.2 },
  } as any,
});
```

### Translucent Material

```typescript
await client.updateComponent({
  id: materialId,
  members: {
    BlendMode: { $type: 'enum', value: 'Alpha', enumType: 'BlendMode' },
    AlbedoColor: { $type: 'colorX', value: { r: 0.6, g: 0.75, b: 0.9, a: 0.3, profile: 'sRGB' } },
  } as any,
});
```

---

## Updating Materials List (Two Steps Required)

MeshRenderer's Materials list must be updated in two steps:

1. **Add element to list** (at this point targetId becomes null)
2. **Get element ID and set reference**

```typescript
// 1. First add element to list
await client.updateComponent({
  id: rendererId,
  members: {
    Materials: {
      $type: 'list',
      elements: [{ $type: 'reference', targetId: materialId }]
    }
  } as any,
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
  } as any,
});
```

**Key Points**:
- Omitting `id` field → New element is added
- Specifying `id` field → Existing element is updated
- Even if `targetId` is specified the first time, it gets ignored and becomes null

---

## ProtoFlux Node Placement

### Resonite Coordinate System
- **X-axis**: Left/Right (right is positive)
- **Y-axis**: Up/Down (up is positive)
- **Z-axis**: Front/Back (front is positive)

### Recommended Placement

Place data flow from left to right (X-axis direction):

```
Left ────────────────────────────────────────────→ Right (X-axis)

[Input Nodes]  →  [Processing Node]  →  [Output Node]  →  [Drive Node]
   x=-1.5            x=-1.0              x=-0.5            x=0
```

### Recommended Placement Values

| Item | Recommended Value |
|------|-------------------|
| Horizontal spacing between nodes | 0.3 to 0.5 |
| Vertical spacing for branches | 0.15 to 0.3 |
| Coordinate system | Relative coordinates from parent slot |

### When There Are Multiple Inputs

Offset vertically on Y-axis:

```typescript
// Input 1 (upper)
await client.addSlot({ name: 'Input1', position: { x: -1.5, y: 0.15, z: 0 } });

// Input 2 (lower)
await client.addSlot({ name: 'Input2', position: { x: -1.5, y: -0.15, z: 0 } });

// Processing node (center)
await client.addSlot({ name: 'Process', position: { x: -1.0, y: 0, z: 0 } });
```

---

## ProtoFlux Variable Storage Selection

### StoredObject vs DataModelObjectFieldStore

| Item | StoredObject\<T\> | DataModelObjectFieldStore\<T\> |
|------|-------------------|-------------------------------|
| Persistence | ❌ Session only | ✅ Persists when world is saved |
| Use Case | Temporary calculation results | Data that needs to be saved |
| Context | ExecutionContext | FrooxEngineContext |
| Type Specification | `StoredObject<string>` | `DataModelObjectFieldStore<string>` |

### When Using DataModelObjectFieldStore

`ObjectWrite` must also use the FrooxEngineContext version:

```typescript
// ❌ Wrong - ExecutionContext version
'[ProtoFluxBindings]...ObjectWrite<string>'

// ✅ Correct - FrooxEngineContext version
'[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>'
```

**Key Point**: Specify `[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext` as the type parameter

---

## Async HTTP Request (GET_String)

### Required Node Structure

```
ButtonEvents.Pressed → StartAsyncTask → GET_String → ObjectWrite → DataModelObjectFieldStore
                                             ↓
                                        OnResponse → Execute ObjectWrite
```

### Component Types

| Node | Type |
|------|------|
| ButtonEvents | `[ProtoFluxBindings]...FrooxEngine.Interaction.ButtonEvents` |
| StartAsyncTask | `[ProtoFluxBindings]...FrooxEngine.Async.StartAsyncTask` |
| GET_String | `[ProtoFluxBindings]...FrooxEngine.Network.GET_String` |
| DataModelObjectFieldStore\<string\> | `[ProtoFluxBindings]...FrooxEngine.Variables.DataModelObjectFieldStore<string>` |
| ObjectWrite (FrooxEngineContext) | `[ProtoFluxBindings]...ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>` |

### Connection Pattern

```typescript
// 1. ButtonEvents.Pressed → StartAsyncTask
await client.updateComponent({
  id: buttonEventsComp.id,
  members: { Pressed: { $type: 'reference', targetId: startAsyncComp.id } } as any,
});

// 2. StartAsyncTask.TaskStart → GET_String
await client.updateComponent({
  id: startAsyncComp.id,
  members: { TaskStart: { $type: 'reference', targetId: webRequestComp.id } } as any,
});

// 3. GET_String.OnResponse → ObjectWrite
const webRequestDetails = await client.getComponent(webRequestComp.id);
const onResponseId = webRequestDetails.data.members.OnResponse.id;
await client.updateComponent({
  id: webRequestComp.id,
  members: { OnResponse: { $type: 'reference', id: onResponseId, targetId: writeComp.id } } as any,
});

// 4. ObjectWrite.Value ← GET_String.Content
const contentId = webRequestDetails.data.members.Content.id;
await client.updateComponent({
  id: writeComp.id,
  members: { Value: { $type: 'reference', targetId: contentId } } as any,
});

// 5. ObjectWrite.Variable ← DataModelObjectFieldStore
await client.updateComponent({
  id: writeComp.id,
  members: { Variable: { $type: 'reference', targetId: storeComp.id } } as any,
});
```

### Items Requiring Manual Configuration

- **ButtonEvents.Button**: Drag and connect PhysicalButton

---

## Notes

- Do not delete system slots (Controllers, Roles, SpawnArea, Light, Skybox, Assets, etc.)
- Materials list requires two-step update (add element → set targetId)
- HSV_ToColorX produces no color if S, V inputs are null (requires ValueInput connection)
- Wiggler only supports floatQ (rotation), not float3 (position)
- When using DataModelObjectFieldStore, FrooxEngineContext version of ObjectWrite is required
- **ProtoFlux nodes created by script require deactivating and reactivating the slot for initialization** (automatically initialized on duplication)

---

## DynamicImpulse Generic Types

### WithValue vs WithObject

| Node | Type Constraint | Usable Types |
|------|-----------------|--------------|
| `DynamicImpulseReceiverWithValue<T>` | `where T : unmanaged` | Primitives like `int`, `float`, `bool`, `colorX` |
| `DynamicImpulseReceiverWithObject<T>` | None | Object types like `string`, `Slot`, `User` |
| `DynamicImpulseTriggerWithValue<T>` | `where T : unmanaged` | Primitive types |
| `DynamicImpulseTriggerWithObject<T>` | None | Object types |

### Type Name Format

```typescript
// Primitive types (int, float, bool, etc.) → WithValue
'[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiverWithValue<int>'
'[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseTriggerWithValue<float>'

// Object types (string, Slot, etc.) → WithObject
'[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiverWithObject<string>'
'[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseTriggerWithObject<[FrooxEngine]FrooxEngine.Slot>'
```

**Note**: `string` is not an `unmanaged` type, so `WithValue<string>` cannot be used. Use `WithObject<string>`.

---

## DynamicImpulse Scope Control

### Important: All Receivers Respond if Target is Not Set

If `ButtonDynamicImpulseTrigger.Target` is not set, **all DynamicImpulseReceivers with the same Tag will respond**.

For multiple instances (e.g., multiple Tic-Tac-Toe games) to work independently, **you must set the item's root slot as Target**.

```typescript
// Set root slot to ButtonDynamicImpulseTrigger.Target
await client.updateComponent({
  id: cellTrigger.id,
  members: {
    PressedTag: { $type: 'string', value: 'Cell_0' },
    Target: { $type: 'reference', targetId: mainId },  // Item's root slot
  } as any,
});
```

**Key Points**:
- When a slot is specified as Target, only Receivers below that slot respond
- Required for multiple instances to work independently
- Specify the item's root (main slot), not the Flux slot

---

## ValueField Initial Value and Null Comparison

### ValueField<string> Initial Value is Null

The initial value of `ValueField<string>` is **null, not empty string**.

To check if it's empty, **you need a null comparison, not an empty string comparison**.

```typescript
// ❌ Wrong - comparing with empty string
// ObjectEquals.A ← CellSource, ObjectEquals.B ← ValueObjectInput("")

// ✅ Correct - null comparison (leave B unconnected)
await client.updateComponent({
  id: equalsComp.id,
  members: {
    A: { $type: 'reference', targetId: cellSourceComp.id },
    // B is left unconnected (becomes null comparison)
  } as any,
});
```

### Writing Null with ObjectWrite

To reset a ValueField to null, **leave ObjectWrite.Value unconnected**:

```typescript
// Set only Variable, don't connect Value → null is written
await client.updateComponent({
  id: writeComp.id,
  members: {
    Variable: { $type: 'reference', targetId: sourceComp.id },
    // Value is unconnected (null is written)
  } as any,
});
```

**Key Points**:
- `ValueField<string>` initial value = null (not empty string)
- `ObjectEquals.B` unconnected → compares A with null
- `ObjectWrite.Value` unconnected → writes null

---

## Game Logic Implementation Patterns (See Tic-Tac-Toe Reference)

### Game State Management (Using ValueField)

Manage game state with `ValueField<T>` components:

```typescript
// Add ValueFields to GameState slot
await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<bool>' });   // isOTurn
await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<bool>' });   // isGameOver
await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' }); // Cell state x 9
await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' }); // resultText
```

### UI Driving (ValueDriver / BooleanValueDriver)

Use `ValueDriver<T>` to reflect ValueField values to UIX Text:

```typescript
// Drive cell text with ValueDriver<string>
await client.addComponent({
  containerSlotId: gameStateId,
  componentType: '[FrooxEngine]FrooxEngine.ValueDriver<string>',
});

// Configuration
await client.updateComponent({
  id: driveId,
  members: {
    ValueSource: { $type: 'reference', targetId: cellValueId },    // ValueField.Value
    DriveTarget: { $type: 'reference', id: driveTargetId, targetId: textContentId }, // Text.Content
  } as any,
});
```

To display different strings based on a bool value, use `BooleanValueDriver<string>`:

```typescript
await client.addComponent({
  containerSlotId: gameStateId,
  componentType: '[FrooxEngine]FrooxEngine.BooleanValueDriver<string>',
});

await client.updateComponent({
  id: turnDriverId,
  members: {
    TrueValue: { $type: 'string', value: "O's Turn" },
    FalseValue: { $type: 'string', value: "X's Turn" },
    TargetField: { $type: 'reference', id: targetFieldId, targetId: turnContentId },
  } as any,
});
```

### Reading/Writing ValueField from ProtoFlux (ObjectValueSource/ValueSource + GlobalReference)

Pattern for reading/writing ValueField within ProtoFlux:

```typescript
// 1. Add ObjectValueSource<string> or ValueSource<bool>
await client.addComponent({
  containerSlotId: slotId,
  componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>',
});

// 2. Add GlobalReference<IValue<T>> to the same slot
await client.addComponent({
  containerSlotId: slotId,
  componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>',
});

// 3. Set GlobalReference.Reference → ValueField.Value
await client.updateComponent({
  id: globalRefComp.id,
  members: { Reference: { $type: 'reference', targetId: valueFieldValueId } } as any,
});

// 4. Set Source.Source → GlobalReference
await client.updateComponent({
  id: sourceComp.id,
  members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any,
});
```

**Key Points**:
- `ObjectValueSource<T>` / `ValueSource<T>` implements `IVariable`
- `GlobalReference<IValue<T>>` bridges to ValueField.Value (which implements `IValue<T>`)
- Can write by connecting Source to ObjectWrite/ValueWrite's Variable

### Win/Lose Logic (Tic-Tac-Toe)

Check 8 lines (3 horizontal, 3 vertical, 2 diagonal) to determine winner:

```typescript
const lines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],  // Horizontal
  [0, 3, 6], [1, 4, 7], [2, 5, 8],  // Vertical
  [0, 4, 8], [2, 4, 6],             // Diagonal
];
```

For each line:
1. **Three cells same check**: Check A==B, B==C with `ObjectEquals<string>`
2. **Exclude null**: Check A != null with `ObjectNotEquals<string>`
3. **AND combination**: (A==B) AND (B==C) AND (A!=null) with `AND_Bool`
4. **8 lines OR**: Chain structure of `OR_Bool` for all line checks

Draw determination:
1. Check all 9 cells != null with `ObjectNotEquals<string>`
2. Check all cells filled with chain of `AND_Bool`
3. **No winner AND all cells filled** = Draw

### Event-Driven (DynamicImpulse)

Button click → Logic execution pattern:

```
Button + ButtonDynamicImpulseTrigger
    ↓ PressedTag="Cell_0"
DynamicImpulseReceiver (Tag="Cell_0")
    ↓ OnTriggered
Logic Processing
```

**Important**: Setting `ButtonDynamicImpulseTrigger.Target` to the root slot means only Receivers within that slot hierarchy respond. Required for multiple instances to work independently.

### Complete Implementation Example

See `src/scripts/create-tictactoe-complete.ts`.

| Feature | Components/Nodes Used |
|---------|----------------------|
| Game State | ValueField<bool/string> |
| UI Driving | ValueDriver<T>, BooleanValueDriver<T> |
| State Read/Write | ObjectValueSource + GlobalReference<IValue<T>> |
| Button Input | Button + ButtonDynamicImpulseTrigger |
| Event Reception | DynamicImpulseReceiver + GlobalValue<string> |
| Conditional Branching | If, ObjectConditional<T> |
| Comparison Operations | ObjectEquals, ObjectNotEquals, AND_Bool, OR_Bool, NOT_Bool |
| Value Writing | ObjectWrite / ValueWrite (FrooxEngineContext version) |
| Subsequent Processing | DynamicImpulseTrigger

---

## Random Value Storage Pattern (See Rock-Paper-Scissors Reference)

### Important: RandomInt Generates a New Value on Each Reference

The `RandomInt` node **generates a new random number each time it is referenced**.

When you want to use the same random value in multiple branches (e.g., CPU hand selection and result judgment), **you need to save it to a ValueField first and then reference it**.

```
❌ Wrong - Directly referencing RandomInt
RandomInt → Equals0 → Cond0 (CPU's hand)
    ↓
   Equals1 → CondResult0 (Result)
   ※ Different random values used in Equals0 and Equals1!

✅ Correct - Save to ValueField then reference
RandomInt → ValueWrite → ValueField<int>
                              ↓
                    ValueSource → Equals0, Equals1
                    ※ Same value is used
```

### Component Configuration

```typescript
// 1. Add ValueField<int> to GameState (for random number storage)
await client.addComponent({
  containerSlotId: gameStateId,
  componentType: '[FrooxEngine]FrooxEngine.ValueField<int>',
});

// 2. RandomWrite slot: ValueSource + GlobalReference + ValueWrite
await client.addComponent({ containerSlotId: randomWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<int>' });
await client.addComponent({ containerSlotId: randomWriteSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<int>>' });
await client.addComponent({ containerSlotId: randomWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,int>' });

// 3. RandomSource slot: ValueSource + GlobalReference (for reading)
await client.addComponent({ containerSlotId: randomSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<int>' });
await client.addComponent({ containerSlotId: randomSourceSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<int>>' });
```

### Flow Connection

```
Button Press
    ↓
PlayerWrite (Save player's hand)
    ↓
RandomWrite (Save random to ValueField) ← RandomInt
    ↓
CpuWrite (Save CPU's hand) ← Compare via RandomSource
    ↓
ResultWrite (Save result) ← Compare via RandomSource
```

### Nested Conditional Branch Pattern (3-Way Selection)

When selecting one from three options, use nested `ObjectConditional`:

```typescript
// Win/Lose table: resultTable[playerIdx][cpuIdx]
// Rock(0) beats Scissors(1), Scissors(1) beats Paper(2), Paper(2) beats Rock(0)
const resultTable = [
  ['Draw!', 'You Win!', 'You Lose...'],   // Player is Rock
  ['You Lose...', 'Draw!', 'You Win!'],   // Player is Scissors
  ['You Win!', 'You Lose...', 'Draw!'],   // Player is Paper
];

// Conditional: cond1 = (rand==1) ? value1 : value2, cond0 = (rand==0) ? value0 : cond1
// → rand=0 → value0, rand=1 → value1, rand=2 → value2
```

### Verified Components (Rock-Paper-Scissors Additions)

| Category | Component | Type Format |
|----------|-----------|-------------|
| ProtoFlux | RandomInt | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Math.Random.RandomInt` |
| ProtoFlux | ValueEquals\<int\> | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueEquals<int>` |
| ProtoFlux | ObjectConditional\<string\> | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectConditional<string>` |
| ProtoFlux | ValueSource\<int\> | `[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<int>` |
| ProtoFlux | GlobalReference\<IValue\<int\>\> | `[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<int>>` |
| ProtoFlux | ValueWrite (int, FrooxEngineContext) | `[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,int>` |

**Note**: The correct type name is `RandomInt` (no underscore), not `Random_Int` (with underscore).

### Reference Script

See `src/scripts/create-janken.ts`.

| Feature | Components/Nodes Used |
|---------|----------------------|
| Random Generation | RandomInt |
| Random Storage | ValueField\<int\> + ValueWrite + ValueSource + GlobalReference |
| 3-Way Selection | Nested ObjectConditional\<string\> |
| Comparison | ValueEquals\<int\> |
| Button Input | Button + ButtonDynamicImpulseTrigger |
| Event Reception | DynamicImpulseReceiver + GlobalValue\<string\> |
| State Display | ValueDriver\<string\> |
