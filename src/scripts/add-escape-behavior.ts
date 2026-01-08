/**
 * 押されたらプレイヤーから逃げる機能を追加するスクリプト
 *
 * RainbowBox に以下の ProtoFlux を追加:
 * ButtonEvents → 方向計算 → TweenValue で移動
 */
import { ResoniteLinkClient } from '../client.js';

const WS_URL = process.argv[2] || 'ws://localhost:58971';

async function main() {
  const client = new ResoniteLinkClient({ url: WS_URL });
  await client.connect();

  try {
    console.log('Adding escape behavior to RainbowBox...\n');

    // 1. RainbowBox を検索
    const box = await client.findSlotByName('RainbowBox', 'Root', 3);
    if (!box?.id) throw new Error('RainbowBox not found');
    console.log(`  Found RainbowBox: ${box.id}`);

    // TouchButton のIDを取得
    const boxData = await client.getSlot({ slotId: box.id, depth: 0, includeComponentData: true });
    const touchButton = boxData.data?.components?.find(c => c.componentType?.includes('TouchButton'));
    if (!touchButton?.id) throw new Error('TouchButton not found');
    console.log(`  Found TouchButton: ${touchButton.id}`);

    // 2. ProtoFlux 用スロットを作成
    const fluxName = `EscapeFlux_${Date.now()}`;
    await client.addSlot({
      parentId: box.id,
      name: fluxName,
      position: { x: 0, y: 0.5, z: 0 },
      isActive: true
    });

    const fluxContainer = await client.findSlotByName(fluxName, box.id, 1);
    if (!fluxContainer?.id) throw new Error('Failed to create flux container');
    console.log(`  Created flux container: ${fluxContainer.id}`);

    // 3. 子スロットを作成（各ノード用）
    const nodeSlots = [
      { name: 'ButtonEvents', x: -0.6, y: 0 },
      { name: 'BoxTransform', x: -0.4, y: 0.1 },
      { name: 'Sub', x: -0.2, y: 0 },
      { name: 'Normalize', x: 0, y: 0 },
      { name: 'Distance', x: 0, y: -0.15 },
      { name: 'Mul', x: 0.2, y: 0 },
      { name: 'Add', x: 0.4, y: 0 },
      { name: 'SetPos', x: 0.6, y: 0 },
      { name: 'BoxRef', x: -0.6, y: 0.15 },
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

    // 子スロットIDを取得
    const containerData = await client.getSlot({ slotId: fluxContainer.id, depth: 1, includeComponentData: false });
    const children = containerData.data?.children || [];

    const getSlotId = (name: string) => {
      const slot = children.find(c => c.name?.value === name);
      if (!slot?.id) throw new Error(`Slot ${name} not found`);
      return slot.id;
    };

    const buttonEventsSlotId = getSlotId('ButtonEvents');
    const boxTransformSlotId = getSlotId('BoxTransform');
    const subSlotId = getSlotId('Sub');
    const normalizeSlotId = getSlotId('Normalize');
    const distanceSlotId = getSlotId('Distance');
    const mulSlotId = getSlotId('Mul');
    const addSlotId = getSlotId('Add');
    const setPosSlotId = getSlotId('SetPos');
    const boxRefSlotId = getSlotId('BoxRef');

    // 4. ProtoFlux コンポーネントを追加
    console.log('  Adding ProtoFlux components...');

    // ButtonEvents
    await client.addComponent({
      containerSlotId: buttonEventsSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Interaction.ButtonEvents',
    });

    // GlobalTransform (箱の位置取得)
    await client.addComponent({
      containerSlotId: boxTransformSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Transform.GlobalTransform',
    });

    // ValueSub<float3> (方向計算: 箱位置 - クリック位置)
    await client.addComponent({
      containerSlotId: subSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueSub<float3>',
    });

    // Normalized_Float3 (正規化)
    await client.addComponent({
      containerSlotId: normalizeSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.Normalized_Float3',
    });

    // ValueInput<float> (逃げる距離)
    await client.addComponent({
      containerSlotId: distanceSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<float>',
    });

    // Mul_Float3_Float (方向 * 距離)
    await client.addComponent({
      containerSlotId: mulSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.Mul_Float3_Float',
    });

    // ValueAdd<float3> (現在位置 + 移動ベクトル)
    await client.addComponent({
      containerSlotId: addSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueAdd<float3>',
    });

    // SetGlobalPosition (位置を設定)
    await client.addComponent({
      containerSlotId: setPosSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Transform.SetGlobalPosition',
    });

    // RefObjectInput<Slot> (箱への参照)
    await client.addComponent({
      containerSlotId: boxRefSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<Slot>',
    });

    console.log('  Added all ProtoFlux components');

    // 5. コンポーネントIDを取得
    const [
      buttonEventsData,
      boxTransformData,
      subData,
      normalizeData,
      distanceData,
      mulData,
      addData,
      setPosData,
      boxRefData,
    ] = await Promise.all([
      client.getSlot({ slotId: buttonEventsSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: boxTransformSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: subSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: normalizeSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: distanceSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: mulSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: addSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: setPosSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: boxRefSlotId, depth: 0, includeComponentData: true }),
    ]);

    const buttonEventsComp = buttonEventsData.data?.components?.find(c => c.componentType?.includes('ButtonEvents'));
    const boxTransformComp = boxTransformData.data?.components?.find(c => c.componentType?.includes('GlobalTransform'));
    const subComp = subData.data?.components?.find(c => c.componentType?.includes('ValueSub'));
    const normalizeComp = normalizeData.data?.components?.find(c => c.componentType?.includes('Normalized'));
    const distanceComp = distanceData.data?.components?.find(c => c.componentType?.includes('ValueInput'));
    const mulComp = mulData.data?.components?.find(c => c.componentType?.includes('Mul_Float3'));
    const addComp = addData.data?.components?.find(c => c.componentType?.includes('ValueAdd'));
    const setPosComp = setPosData.data?.components?.find(c => c.componentType?.includes('SetGlobalPosition'));
    const boxRefComp = boxRefData.data?.components?.find(c => c.componentType?.includes('RefObjectInput'));

    if (!buttonEventsComp?.id || !boxTransformComp?.id || !subComp?.id || !normalizeComp?.id ||
        !distanceComp?.id || !mulComp?.id || !addComp?.id || !setPosComp?.id || !boxRefComp?.id) {
      console.log('Component IDs:', {
        buttonEventsComp: buttonEventsComp?.id,
        boxTransformComp: boxTransformComp?.id,
        subComp: subComp?.id,
        normalizeComp: normalizeComp?.id,
        distanceComp: distanceComp?.id,
        mulComp: mulComp?.id,
        addComp: addComp?.id,
        setPosComp: setPosComp?.id,
        boxRefComp: boxRefComp?.id,
      });
      throw new Error('Failed to find all components');
    }
    console.log('  Got all component IDs');

    // 6. 値を設定
    // 逃げる距離 = 0.5m
    await client.updateComponent({
      id: distanceComp.id,
      members: { Value: { $type: 'float', value: 0.5 } } as any,
    });
    console.log('  Set escape distance: 0.5m');

    // BoxRef に RainbowBox を設定
    await client.updateComponent({
      id: boxRefComp.id,
      members: { Target: { $type: 'reference', targetId: box.id } } as any,
    });
    console.log('  Set box reference');

    // 7. 接続を設定
    console.log('  Connecting nodes...');

    // GlobalTransform.Instance ← BoxRef
    await client.updateComponent({
      id: boxTransformComp.id,
      members: { Instance: { $type: 'reference', targetId: boxRefComp.id } } as any,
    });

    // ValueSub.A ← GlobalTransform.GlobalPosition (箱の位置)
    // ValueSub.B ← ButtonEvents.GlobalPoint (クリック位置)
    await client.updateComponent({
      id: subComp.id,
      members: {
        A: { $type: 'reference', targetId: boxTransformComp.id },
        B: { $type: 'reference', targetId: buttonEventsComp.id },
      } as any,
    });

    // Normalized.A ← ValueSub (方向ベクトル)
    await client.updateComponent({
      id: normalizeComp.id,
      members: { A: { $type: 'reference', targetId: subComp.id } } as any,
    });

    // Mul.A ← Normalized (正規化された方向)
    // Mul.B ← Distance (逃げる距離)
    await client.updateComponent({
      id: mulComp.id,
      members: {
        A: { $type: 'reference', targetId: normalizeComp.id },
        B: { $type: 'reference', targetId: distanceComp.id },
      } as any,
    });

    // Add.A ← GlobalTransform.GlobalPosition (現在位置)
    // Add.B ← Mul (移動ベクトル)
    await client.updateComponent({
      id: addComp.id,
      members: {
        A: { $type: 'reference', targetId: boxTransformComp.id },
        B: { $type: 'reference', targetId: mulComp.id },
      } as any,
    });

    // SetGlobalPosition.Instance ← BoxRef
    // SetGlobalPosition.Position ← Add (新しい位置)
    await client.updateComponent({
      id: setPosComp.id,
      members: {
        Instance: { $type: 'reference', targetId: boxRefComp.id },
        Position: { $type: 'reference', targetId: addComp.id },
      } as any,
    });

    // ButtonEvents.Pressed ← SetGlobalPosition (トリガー接続)
    await client.updateComponent({
      id: buttonEventsComp.id,
      members: {
        Pressed: { $type: 'reference', targetId: setPosComp.id },
      } as any,
    });

    console.log('  Connected all nodes');

    // ButtonEvents に TouchButton を接続するには GlobalValue<IButton> が必要
    // これは複雑なので、別途対応が必要

    console.log('\n✨ Escape behavior added!');
    console.log('  Note: You need to manually connect ButtonEvents.Button to TouchButton in Resonite');
    console.log('  - Open the ProtoFlux');
    console.log('  - Drag TouchButton component to ButtonEvents.Button input');

  } finally {
    client.disconnect();
  }
}

main().catch(console.error);
