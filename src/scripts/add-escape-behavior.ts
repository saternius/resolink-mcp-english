/**
 * Script to add escape-from-origin behavior when pressed
 *
 * Sample using GlobalTransform output members (empty type)
 * With ResoniteLink update, ProtoFlux node outputs are now returned as $type: "empty"
 *
 * Flow:
 * ButtonEvents → SetGlobalPosition
 *                ↑
 *   GlobalTransform.GlobalPosition + Normalize(GlobalPosition - Origin) * Distance
 */
import { ResoniteLinkClient } from '../client.js';

const WS_URL = process.argv[2] || 'ws://localhost:3343';

async function main() {
  const client = new ResoniteLinkClient({ url: WS_URL });
  await client.connect();

  try {
    console.log('Adding escape behavior with output member references...\n');

    // 1. Search for RainbowBox
    const box = await client.findSlotByName('RainbowBox', 'Root', 3);
    if (!box?.id) throw new Error('RainbowBox not found');
    console.log(`  Found RainbowBox: ${box.id}`);

    // 2. Create slot for ProtoFlux
    const fluxName = `EscapeFlux_${Date.now()}`;
    await client.addSlot({
      parentId: box.id,
      name: fluxName,
      position: { x: 0, y: 0.8, z: 0 },
      isActive: true
    });

    const fluxContainer = await client.findSlotByName(fluxName, box.id, 1);
    if (!fluxContainer?.id) throw new Error('Failed to create flux container');
    console.log(`  Created flux container: ${fluxContainer.id}`);

    // 3. Create child slots (for each node)
    const nodeSlots = [
      { name: 'BoxRef', x: -0.9, y: 0.15 },         // RefObjectInput<Slot>
      { name: 'BoxTransform', x: -0.6, y: 0 },     // GlobalTransform (multiple outputs)
      { name: 'Origin', x: -0.6, y: -0.2 },        // ValueInput<float3>
      { name: 'Sub', x: -0.3, y: 0 },              // box position - origin
      { name: 'Normalize', x: 0, y: 0 },           // normalize
      { name: 'Distance', x: 0, y: -0.2 },         // escape distance
      { name: 'Mul', x: 0.3, y: 0 },               // direction * distance
      { name: 'Add', x: 0.6, y: 0 },               // current position + movement
      { name: 'SetPos', x: 0.9, y: 0 },            // SetGlobalPosition
      { name: 'OnButton', x: -0.9, y: -0.1 },      // ButtonEvents
    ];

    for (const node of nodeSlots) {
      await client.addSlot({
        parentId: fluxContainer.id,
        name: node.name,
        position: { x: node.x, y: node.y, z: 0 },
        isActive: true
      });
    }
    console.log('  Created node slots');

    // Get child slot IDs
    const containerData = await client.getSlot({ slotId: fluxContainer.id, depth: 1, includeComponentData: false });
    const children = containerData.data?.children || [];

    const getSlotId = (name: string) => {
      const slot = children.find(c => c.name?.value === name);
      if (!slot?.id) throw new Error(`Slot ${name} not found`);
      return slot.id;
    };

    // 4. Add ProtoFlux components
    console.log('  Adding ProtoFlux components...');

    const boxRefSlotId = getSlotId('BoxRef');
    const boxTransformSlotId = getSlotId('BoxTransform');
    const originSlotId = getSlotId('Origin');
    const subSlotId = getSlotId('Sub');
    const normalizeSlotId = getSlotId('Normalize');
    const distanceSlotId = getSlotId('Distance');
    const mulSlotId = getSlotId('Mul');
    const addSlotId = getSlotId('Add');
    const setPosSlotId = getSlotId('SetPos');
    const onButtonSlotId = getSlotId('OnButton');

    // Add components
    await client.addComponent({
      containerSlotId: boxRefSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.Slot>',
    });

    await client.addComponent({
      containerSlotId: boxTransformSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Transform.GlobalTransform',
    });

    await client.addComponent({
      containerSlotId: originSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<float3>',
    });

    await client.addComponent({
      containerSlotId: subSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueSub<float3>',
    });

    await client.addComponent({
      containerSlotId: normalizeSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.Normalized_Float3',
    });

    await client.addComponent({
      containerSlotId: distanceSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<float>',
    });

    await client.addComponent({
      containerSlotId: mulSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.Mul_Float3_Float',
    });

    await client.addComponent({
      containerSlotId: addSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueAdd<float3>',
    });

    await client.addComponent({
      containerSlotId: setPosSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Transform.SetGlobalPosition',
    });

    await client.addComponent({
      containerSlotId: onButtonSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Interaction.ButtonEvents',
    });

    console.log('  Added all ProtoFlux components');

    // 5. Get component IDs
    const [
      boxRefData,
      boxTransformData,
      originData,
      subData,
      normalizeData,
      distanceData,
      mulData,
      addData,
      setPosData,
      onButtonData,
    ] = await Promise.all([
      client.getSlot({ slotId: boxRefSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: boxTransformSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: originSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: subSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: normalizeSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: distanceSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: mulSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: addSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: setPosSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: onButtonSlotId, depth: 0, includeComponentData: true }),
    ]);

    const boxRefComp = boxRefData.data?.components?.find(c => c.componentType?.includes('RefObjectInput'));
    const boxTransformComp = boxTransformData.data?.components?.find(c => c.componentType?.includes('GlobalTransform'));
    const originComp = originData.data?.components?.find(c => c.componentType?.includes('ValueInput'));
    const subComp = subData.data?.components?.find(c => c.componentType?.includes('ValueSub'));
    const normalizeComp = normalizeData.data?.components?.find(c => c.componentType?.includes('Normalized'));
    const distanceComp = distanceData.data?.components?.find(c => c.componentType?.includes('ValueInput'));
    const mulComp = mulData.data?.components?.find(c => c.componentType?.includes('Mul_Float3'));
    const addComp = addData.data?.components?.find(c => c.componentType?.includes('ValueAdd'));
    const setPosComp = setPosData.data?.components?.find(c => c.componentType?.includes('SetGlobalPosition'));
    const onButtonComp = onButtonData.data?.components?.find(c => c.componentType?.includes('ButtonEvents'));

    if (!boxRefComp?.id || !boxTransformComp?.id || !originComp?.id || !subComp?.id ||
        !normalizeComp?.id || !distanceComp?.id || !mulComp?.id || !addComp?.id ||
        !setPosComp?.id || !onButtonComp?.id) {
      throw new Error('Failed to find all components');
    }

    // IMPORTANT: Get GlobalTransform output member ID (empty type)
    const globalPositionId = (boxTransformComp.members as any)?.GlobalPosition?.id;
    if (!globalPositionId) {
      throw new Error('GlobalPosition output not found - ResoniteLink may need update');
    }
    console.log(`  GlobalTransform.GlobalPosition output ID: ${globalPositionId}`);

    // 6. Set values
    console.log('  Setting values...');

    // Set RainbowBox to BoxRef
    await client.updateComponent({
      id: boxRefComp.id,
      members: { Target: { $type: 'reference', targetId: box.id } } as any,
    });

    // Origin = (0, 0, 0)
    await client.updateComponent({
      id: originComp.id,
      members: { Value: { $type: 'float3', value: { x: 0, y: 0, z: 0 } } } as any,
    });

    // Escape distance = 0.5m
    await client.updateComponent({
      id: distanceComp.id,
      members: { Value: { $type: 'float', value: 0.5 } } as any,
    });

    // 7. Set connections
    console.log('  Connecting nodes...');

    // GlobalTransform.Instance ← BoxRef
    await client.updateComponent({
      id: boxTransformComp.id,
      members: { Instance: { $type: 'reference', targetId: boxRefComp.id } } as any,
    });

    // Sub.A ← GlobalTransform.GlobalPosition (directly reference output ID!)
    // Sub.B ← Origin
    await client.updateComponent({
      id: subComp.id,
      members: {
        A: { $type: 'reference', targetId: globalPositionId },  // Reference output ID
        B: { $type: 'reference', targetId: originComp.id },
      } as any,
    });
    console.log('  Connected Sub: GlobalPosition - Origin');

    // Normalize.A ← Sub
    await client.updateComponent({
      id: normalizeComp.id,
      members: { A: { $type: 'reference', targetId: subComp.id } } as any,
    });

    // Mul.A ← Normalize, Mul.B ← Distance
    await client.updateComponent({
      id: mulComp.id,
      members: {
        A: { $type: 'reference', targetId: normalizeComp.id },
        B: { $type: 'reference', targetId: distanceComp.id },
      } as any,
    });

    // Add.A ← GlobalTransform.GlobalPosition (directly reference output ID!)
    // Add.B ← Mul
    await client.updateComponent({
      id: addComp.id,
      members: {
        A: { $type: 'reference', targetId: globalPositionId },  // Reference output ID
        B: { $type: 'reference', targetId: mulComp.id },
      } as any,
    });
    console.log('  Connected Add: GlobalPosition + Mul');

    // SetPos.Instance ← BoxRef, SetPos.Position ← Add
    await client.updateComponent({
      id: setPosComp.id,
      members: {
        Instance: { $type: 'reference', targetId: boxRefComp.id },
        Position: { $type: 'reference', targetId: addComp.id },
      } as any,
    });

    // ButtonEvents.Pressed ← SetPos
    await client.updateComponent({
      id: onButtonComp.id,
      members: {
        Pressed: { $type: 'reference', targetId: setPosComp.id },
      } as any,
    });

    console.log('\n✨ Escape behavior added successfully!');
    console.log('  Key: Used GlobalTransform.GlobalPosition output ID directly');
    console.log('  Note: Manually connect ButtonEvents.Button to TouchButton in Resonite');

  } finally {
    client.disconnect();
  }
}

main().catch(console.error);
