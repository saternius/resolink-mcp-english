# ResoLink MCP - UIX Development Guidelines

## Work Policy

### When to Use MCP (Research & Testing)
- Investigating component type names and formats
- Checking existing slot/component structures
- Testing single component behavior
- Lightweight experimentation and prototyping

### When to Use Scripts (Production Builds)
- Batch creation of UIX interfaces
- Building finished products
- Generating repeated patterns
- Creating complex ProtoFlux logic

**Reason**: Attaching components one by one via MCP consumes a lot of context, so production builds should be executed in batch using scripts.

---

## Component Type Format

### Basic Components (FrooxEngine)
```
[FrooxEngine]FrooxEngine.<ComponentName>
```

### UIX Components
```
[FrooxEngine]FrooxEngine.UIX.<ComponentName>
```

### ProtoFlux Nodes
```
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.<Category>.<NodeName>
```

### Generic Types (ProtoFlux)
```
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<int>
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueAdd<int>
[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>
```

**Key Points**:
- `[ProtoFluxBindings]` prefix is required for ProtoFlux nodes
- Use C# aliases for primitive types (`int`, `float`, `bool`, `colorX`, `string`)
- Use `<>` notation (backtick notation is not supported)

### Object Type Generic Parameters

When using object types like `Slot` or `User` as generic parameters, **the type parameter also requires an assembly-qualified name**:
```
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.Slot>
[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.User>
[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>
```

---

## Verified Components

| Category | Component | Type Format |
|----------|-----------|-------------|
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
| State | ValueField\<T\> | `[FrooxEngine]FrooxEngine.ValueField<bool>` / `<string>` / `<int>` |
| State | ValueDriver\<T\> | `[FrooxEngine]FrooxEngine.ValueDriver<string>` |
| State | BooleanValueDriver\<T\> | `[FrooxEngine]FrooxEngine.BooleanValueDriver<string>` |
| ProtoFlux | DynamicImpulseReceiver | `[ProtoFluxBindings]...Actions.DynamicImpulseReceiver` |
| ProtoFlux | DynamicImpulseTrigger | `[ProtoFluxBindings]...Actions.DynamicImpulseTrigger` |
| ProtoFlux | GlobalValue\<string\> | `[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>` |
| ProtoFlux | GlobalReference\<IValue\<T\>\> | `[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>` |
| ProtoFlux | ObjectValueSource\<T\> | `[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>` |
| ProtoFlux | ValueSource\<T\> | `[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>` |
| ProtoFlux | ObjectWrite (FrooxEngineContext) | `[ProtoFluxBindings]...ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>` |
| ProtoFlux | ValueWrite (FrooxEngineContext) | `[ProtoFluxBindings]...ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>` |
| ProtoFlux | If | `[ProtoFluxBindings]...If` |
| ProtoFlux | ObjectConditional\<T\> | `[ProtoFluxBindings]...ObjectConditional<string>` |
| ProtoFlux | ObjectEquals\<T\> | `[ProtoFluxBindings]...ObjectEquals<string>` |
| ProtoFlux | ObjectNotEquals\<T\> | `[ProtoFluxBindings]...ObjectNotEquals<string>` |
| ProtoFlux | ValueEquals\<T\> | `[ProtoFluxBindings]...ValueEquals<int>` |
| ProtoFlux | AND_Bool | `[ProtoFluxBindings]...Operators.AND_Bool` |
| ProtoFlux | OR_Bool | `[ProtoFluxBindings]...Operators.OR_Bool` |
| ProtoFlux | NOT_Bool | `[ProtoFluxBindings]...Operators.NOT_Bool` |
| ProtoFlux | ValueInput\<T\> | `[ProtoFluxBindings]...ValueInput<bool>` |
| ProtoFlux | ValueObjectInput\<T\> | `[ProtoFluxBindings]...ValueObjectInput<string>` |
| ProtoFlux | RandomInt | `[ProtoFluxBindings]...Math.Random.RandomInt` |
| ProtoFlux | RefObjectInput\<Slot\> | `[ProtoFluxBindings]...RefObjectInput<[FrooxEngine]FrooxEngine.Slot>` |
| ProtoFlux | RefObjectInput\<User\> | `[ProtoFluxBindings]...RefObjectInput<[FrooxEngine]FrooxEngine.User>` |
| Async | StartAsyncTask | `[ProtoFluxBindings]...FrooxEngine.Async.StartAsyncTask` |
| Async | GET_String | `[ProtoFluxBindings]...FrooxEngine.Network.GET_String` |
| Async | StringToAbsoluteURI | `[ProtoFluxBindings]...Utility.Uris.StringToAbsoluteURI` |
| Async | DataModelObjectFieldStore\<T\> | `[ProtoFluxBindings]...FrooxEngine.Variables.DataModelObjectFieldStore<string>` |

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

### Basic UIX Structure

```
Root (scale: 0.001)
├── Canvas
├── Grabbable (if you want it to be grabbable and movable)
├── UI_UnlitMaterial
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

To create text with a background color, **separate them into different slots**:

```
BackgroundSlot
├── RectTransform
└── Image (background)
TextSlot (child of BackgroundSlot)
├── RectTransform
└── Text (text)
```

### Important: Image Requires UI_UnlitMaterial

**If the Image component's Material is not set, the Unlit rendering order is not processed correctly and display becomes corrupted.**

```typescript
// 1. Add UI_UnlitMaterial to the UIX root
await client.addComponent({
  containerSlotId: uixRootId,
  componentType: '[FrooxEngine]FrooxEngine.UI_UnlitMaterial',
});

// 2. Configure UI_UnlitMaterial (Important: these values ensure correct rendering order)
await client.updateComponent({
  id: uiMaterial.id,
  members: {
    ZWrite: { $type: 'enum', value: 'On', enumType: 'ZWrite' },
    OffsetFactor: { $type: 'float', value: 1 },
    OffsetUnits: { $type: 'float', value: 100 },
    Sidedness: { $type: 'enum', value: 'Double', enumType: 'Sidedness' },
  } as any,
});

// 3. Set to Image.Material
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
    HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
    VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
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

### UIX Notes

- Attaching TextField automatically attaches TextEditor as well

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
import { ResoniteLinkClient } from '../client.js';

async function main() {
  const url = process.argv[2] || 'ws://localhost:29551';
  const client = new ResoniteLinkClient({ url });
  await client.connect();

  try {
    // 1. Create main slot
    const slotName = `MyUIX_${Date.now()}`;
    await client.addSlot({
      name: slotName,
      position: { x: 0, y: 1.5, z: 1.5 },
      isActive: true,
    });

    const mainSlot = await client.findSlotByName(slotName, 'Root', 1);
    if (!mainSlot?.id) throw new Error('Main slot not found');
    const mainId = mainSlot.id;

    // 2. Set UIX scale
    await client.updateSlot({
      id: mainId,
      scale: { x: 0.001, y: 0.001, z: 0.001 },
    });

    // 3. Add Canvas + UI_UnlitMaterial
    await client.addComponent({ containerSlotId: mainId, componentType: '[FrooxEngine]FrooxEngine.UIX.Canvas' });
    await client.addComponent({ containerSlotId: mainId, componentType: '[FrooxEngine]FrooxEngine.UI_UnlitMaterial' });

    // 4. Build UI structure...

  } finally {
    client.disconnect();
  }
}

main();
```

### Helper Functions
```typescript
// Find component by type
function findComponent(data: any, typeIncludes: string, exclude?: string) {
  return data?.components?.find((c: any) => {
    const typeStr = c.type || c.componentType || '';
    const match = typeStr.includes(typeIncludes);
    if (exclude) return match && !typeStr.includes(exclude);
    return match;
  });
}

// Get child slot ID
async function getChildSlotId(client: ResoniteLinkClient, parentId: string, name: string): Promise<string> {
  const data = await client.getSlot({ slotId: parentId, depth: 1 });
  const child = data.data?.children?.find((c: any) => c.name?.value === name);
  if (!child?.id) throw new Error(`Child slot "${name}" not found`);
  return child.id;
}
```

---

## ProtoFlux for UIX Apps

### Important: One ProtoFlux Component Per Slot

- Don't mix ProtoFlux nodes with UIX components
- Create a parent slot called "Flux" and place ProtoFlux slots under it

```
MyUIXApp
├── Canvas, UI_UnlitMaterial
├── Background (Image)
├── Content (layouts, buttons, text)
└── Flux (ProtoFlux parent)
    ├── Receiver (DynamicImpulseReceiver)
    ├── TagInput (GlobalValue<string>)
    ├── Logic nodes...
    └── Write nodes...
```

### Node Placement

Place data flow from left to right (X-axis direction):

```
Left ────────────────────────────────────────────→ Right (X-axis)

[Input Nodes]  →  [Processing Node]  →  [Output Node]  →  [Write Node]
   x=-1.5            x=-1.0              x=-0.5            x=0
```

| Item | Recommended Value |
|------|-------------------|
| Horizontal spacing between nodes | 0.3 to 0.5 |
| Vertical spacing for branches | 0.15 to 0.3 |

### Variable Storage Selection

| Item | StoredObject\<T\> | DataModelObjectFieldStore\<T\> |
|------|-------------------|-------------------------------|
| Persistence | Session only | Persists when world is saved |
| Use Case | Temporary calculation results | Data that needs to be saved |
| Context | ExecutionContext | FrooxEngineContext |

When using DataModelObjectFieldStore, `ObjectWrite` must also use the FrooxEngineContext version:
```typescript
'[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>'
```

---

## State Management

### ValueField for State Storage

```typescript
// Add ValueFields to a GameState slot
await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<bool>' });
await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' });
```

### ValueDriver for UI Binding

Use `ValueDriver<T>` to reflect ValueField values to UIX Text:

```typescript
await client.addComponent({
  containerSlotId: gameStateId,
  componentType: '[FrooxEngine]FrooxEngine.ValueDriver<string>',
});

// Get component IDs
const driveDetails = await client.getComponent(drive.id);
const driveTargetId = driveDetails.data?.members?.DriveTarget?.id;

await client.updateComponent({
  id: drive.id,
  members: {
    ValueSource: { $type: 'reference', targetId: cellValueId },    // ValueField.Value
    DriveTarget: { $type: 'reference', id: driveTargetId, targetId: textContentId }, // Text.Content
  } as any,
});
```

### BooleanValueDriver for Conditional Text

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

---

## Button Interaction

### UIX Button + ButtonDynamicImpulseTrigger

```typescript
// Add Button and trigger to a UIX slot
await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.UIX.Button' });
await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.ButtonDynamicImpulseTrigger' });

// Configure trigger
await client.updateComponent({
  id: cellTrigger.id,
  members: {
    PressedTag: { $type: 'string', value: 'Cell_0' },
    Target: { $type: 'reference', targetId: mainId },  // Scope to this item only
  } as any,
});
```

### DynamicImpulseReceiver

```typescript
// Add receiver and tag input
await client.addComponent({ containerSlotId: receiverSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver' });
await client.addComponent({ containerSlotId: tagInputSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>' });

// Set tag value
await client.updateComponent({ id: tagInputComp.id, members: { Value: { $type: 'string', value: 'Cell_0' } } as any });

// Connect receiver to tag
await client.updateComponent({
  id: receiverComp.id,
  members: { Tag: { $type: 'reference', targetId: tagInputComp.id } } as any,
});

// Connect OnTriggered to next node
const receiverDetails = await client.getComponent(receiverComp.id);
const onTriggeredId = receiverDetails.data?.members?.OnTriggered?.id;
await client.updateComponent({
  id: receiverComp.id,
  members: { OnTriggered: { $type: 'reference', id: onTriggeredId, targetId: ifComp.id } } as any,
});
```

### DynamicImpulse Scope Control

If `ButtonDynamicImpulseTrigger.Target` is not set, **all DynamicImpulseReceivers with the same Tag will respond**.

For multiple instances to work independently, **set the item's root slot as Target**.

### DynamicImpulse Generic Types

| Node | Type Constraint | Usable Types |
|------|-----------------|--------------|
| `WithValue<T>` | `where T : unmanaged` | `int`, `float`, `bool`, `colorX` |
| `WithObject<T>` | None | `string`, `Slot`, `User` |

**Note**: `string` is not `unmanaged`, so use `WithObject<string>`, not `WithValue<string>`.

---

## Reading/Writing World State

### ObjectValueSource + GlobalReference Pattern

For reading/writing ValueField within ProtoFlux:

```typescript
// 1. Add ObjectValueSource<string>
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

### RefObjectInput for World References

```typescript
// Reference a Slot
await client.addComponent({
  containerSlotId: targetSlotSlotId,
  componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.Slot>',
});

await client.updateComponent({
  id: targetSlotComp.id,
  members: { Target: { $type: 'reference', targetId: mainId } } as any,
});
```

### Referencing Output Members (empty type)

ProtoFlux node **output members** are returned as `$type: "empty"`. For multi-output nodes:

```typescript
// Get output member IDs
const globalPositionId = globalTransform.members.GlobalPosition.id;
const globalRotationId = globalTransform.members.GlobalRotation.id;

// Connect by referencing output ID directly
await client.updateComponent({
  id: subComp.id,
  members: {
    A: { $type: 'reference', targetId: globalPositionId },
  } as any,
});
```

---

## Async HTTP Requests

### StartAsyncTask + GET_String Pattern

```
ButtonEvents.Pressed → StartAsyncTask → GET_String → ObjectWrite → DataModelObjectFieldStore
                                             ↓
                                        OnResponse → Execute ObjectWrite
```

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
```

---

## Logic Patterns

### ValueField Initial Value and Null Comparison

The initial value of `ValueField<string>` is **null, not empty string**.

```typescript
// Null comparison - leave B unconnected
await client.updateComponent({
  id: equalsComp.id,
  members: {
    A: { $type: 'reference', targetId: cellSourceComp.id },
    // B is left unconnected (becomes null comparison)
  } as any,
});

// Writing null - leave Value unconnected
await client.updateComponent({
  id: writeComp.id,
  members: {
    Variable: { $type: 'reference', targetId: sourceComp.id },
    // Value is unconnected (null is written)
  } as any,
});
```

### Conditional Branching

```typescript
// If node
await client.updateComponent({
  id: ifComp.id,
  members: { Condition: { $type: 'reference', targetId: conditionComp.id } } as any,
});

// Connect OnTrue/OnFalse
const ifDetails = await client.getComponent(ifComp.id);
const onTrueId = ifDetails.data?.members?.OnTrue?.id;
await client.updateComponent({
  id: ifComp.id,
  members: { OnTrue: { $type: 'reference', id: onTrueId, targetId: writeComp.id } } as any,
});

// ObjectConditional for value selection
await client.updateComponent({
  id: conditionalComp.id,
  members: {
    Condition: { $type: 'reference', targetId: turnSourceComp.id },
    OnTrue: { $type: 'reference', targetId: oInputComp.id },
    OnFalse: { $type: 'reference', targetId: xInputComp.id },
  } as any,
});
```

### Boolean Logic Chains

```typescript
// AND
await client.updateComponent({
  id: andComp.id,
  members: {
    A: { $type: 'reference', targetId: cond1.id },
    B: { $type: 'reference', targetId: cond2.id },
  } as any,
});

// OR
await client.updateComponent({
  id: orComp.id,
  members: {
    A: { $type: 'reference', targetId: cond1.id },
    B: { $type: 'reference', targetId: cond2.id },
  } as any,
});

// NOT
await client.updateComponent({
  id: notComp.id,
  members: { A: { $type: 'reference', targetId: sourceComp.id } } as any,
});
```

### Random Value Storage Pattern

**Important**: `RandomInt` generates a new value on each reference. Save to ValueField first:

```
RandomInt → ValueWrite → ValueField<int>
                              ↓
                    ValueSource → multiple uses
```

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

### Format
```typescript
{ $type: 'enum', value: 'value name', enumType: 'Enum type name' }
```

### UIX Text Alignment
| Enum Type Name | Values |
|----------------|--------|
| `TextHorizontalAlignment` | `Left`, `Center`, `Right` |
| `TextVerticalAlignment` | `Top`, `Middle`, `Bottom` |

### UI_UnlitMaterial
| Property | Enum Type | Values |
|----------|-----------|--------|
| ZWrite | `ZWrite` | `On`, `Off` |
| Sidedness | `Sidedness` | `Front`, `Back`, `Double` |

---

## Notes

- Do not delete system slots (Controllers, Roles, SpawnArea, Light, Skybox, Assets, etc.)
- **ProtoFlux nodes created by script require deactivating and reactivating the slot for initialization** (automatically initialized on duplication)
- ObjectFieldDrive+Proxy timing issue: Wait 100ms after adding, then re-fetch component info before setting reference
- When using DataModelObjectFieldStore, FrooxEngineContext version of ObjectWrite/ValueWrite is required

---

## Reference Scripts

- `create-tictactoe-complete.ts` - Full UIX game with ProtoFlux logic
- `create-weather-widget.ts` - UIX + HTTP requests
- `create-janken.ts` - Random value handling pattern
