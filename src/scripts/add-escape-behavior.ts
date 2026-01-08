/**
 * 押されたら原点から逃げる機能を追加するスクリプト
 *
 * RainbowBox に以下の ProtoFlux を追加:
 * ボタン押下 → 方向計算(原点から離れる方向) → 位置更新
 *
 * ValueSource<float3> を使ってPositionを読み取り、単一出力として接続
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

    // Position フィールドIDを取得
    const boxData = await client.getSlot({ slotId: box.id, depth: 0, includeComponentData: true });
    const positionFieldId = (boxData.data as any)?.position?.id;
    if (!positionFieldId) throw new Error('Position field not found');
    console.log(`  Position field ID: ${positionFieldId}`);

    // TouchButton のIDを取得
    const touchButton = boxData.data?.components?.find(c => c.componentType?.includes('TouchButton'));
    if (!touchButton?.id) throw new Error('TouchButton not found');
    console.log(`  Found TouchButton: ${touchButton.id}`);

    // 2. ProtoFlux 用スロットを作成
    const fluxName = `EscapeFlux2_${Date.now()}`;
    await client.addSlot({
      parentId: box.id,
      name: fluxName,
      position: { x: 0, y: 0.8, z: 0 },
      isActive: true
    });

    const fluxContainer = await client.findSlotByName(fluxName, box.id, 1);
    if (!fluxContainer?.id) throw new Error('Failed to create flux container');
    console.log(`  Created flux container: ${fluxContainer.id}`);

    // 3. 子スロットを作成（各ノード用）
    const nodeSlots = [
      { name: 'PosSource', x: -0.6, y: 0.1 },      // ValueSource<float3> for position
      { name: 'Origin', x: -0.6, y: -0.1 },        // ValueInput<float3> for origin (0,0,0)
      { name: 'Sub', x: -0.3, y: 0 },              // 箱位置 - 原点 = 方向
      { name: 'Normalize', x: 0, y: 0 },           // 正規化
      { name: 'Distance', x: 0, y: -0.15 },        // 逃げる距離
      { name: 'Mul', x: 0.3, y: 0 },               // 方向 * 距離
      { name: 'Add', x: 0.6, y: 0 },               // 現在位置 + 移動量
      { name: 'Write', x: 0.9, y: 0 },             // Write<float3> で位置を書き込み
      { name: 'OnButton', x: -0.9, y: 0 },         // ButtonEvents
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

    const posSourceSlotId = getSlotId('PosSource');
    const originSlotId = getSlotId('Origin');
    const subSlotId = getSlotId('Sub');
    const normalizeSlotId = getSlotId('Normalize');
    const distanceSlotId = getSlotId('Distance');
    const mulSlotId = getSlotId('Mul');
    const addSlotId = getSlotId('Add');
    const writeSlotId = getSlotId('Write');
    const onButtonSlotId = getSlotId('OnButton');

    // 4. ProtoFlux コンポーネントを追加
    console.log('  Adding ProtoFlux components...');

    // ValueSource<float3> - 位置を読み取る（単一float3出力）
    await client.addComponent({
      containerSlotId: posSourceSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<float3>',
    });

    // GlobalReference<IValue<float3>> - Positionフィールドへの参照（ValueSourceに必要）
    await client.addComponent({
      containerSlotId: posSourceSlotId,
      componentType: '[FrooxEngine]FrooxEngine.GlobalReference<[FrooxEngine]FrooxEngine.IValue<float3>>',
    });

    // ValueInput<float3> - 原点 (0,0,0)
    await client.addComponent({
      containerSlotId: originSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<float3>',
    });

    // ValueSub<float3> (方向計算: 箱位置 - 原点)
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

    // Write<float3> - 位置を書き込む
    await client.addComponent({
      containerSlotId: writeSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.Write<float3>',
    });

    // ButtonEvents - ボタンイベント
    await client.addComponent({
      containerSlotId: onButtonSlotId,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Interaction.ButtonEvents',
    });

    console.log('  Added all ProtoFlux components');

    // 5. コンポーネントIDを取得
    const [
      posSourceData,
      originData,
      subData,
      normalizeData,
      distanceData,
      mulData,
      addData,
      writeData,
      onButtonData,
    ] = await Promise.all([
      client.getSlot({ slotId: posSourceSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: originSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: subSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: normalizeSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: distanceSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: mulSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: addSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: writeSlotId, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: onButtonSlotId, depth: 0, includeComponentData: true }),
    ]);

    const posSourceComp = posSourceData.data?.components?.find(c => c.componentType?.includes('ValueSource'));
    const globalRefComp = posSourceData.data?.components?.find(c => c.componentType?.includes('GlobalReference'));
    const originComp = originData.data?.components?.find(c => c.componentType?.includes('ValueInput'));
    const subComp = subData.data?.components?.find(c => c.componentType?.includes('ValueSub'));
    const normalizeComp = normalizeData.data?.components?.find(c => c.componentType?.includes('Normalized'));
    const distanceComp = distanceData.data?.components?.find(c => c.componentType?.includes('ValueInput'));
    const mulComp = mulData.data?.components?.find(c => c.componentType?.includes('Mul_Float3'));
    const addComp = addData.data?.components?.find(c => c.componentType?.includes('ValueAdd'));
    const writeComp = writeData.data?.components?.find(c => c.componentType?.includes('Write'));
    const onButtonComp = onButtonData.data?.components?.find(c => c.componentType?.includes('ButtonEvents'));

    console.log('  Component IDs:', {
      posSourceComp: posSourceComp?.id,
      globalRefComp: globalRefComp?.id,
      originComp: originComp?.id,
      subComp: subComp?.id,
      normalizeComp: normalizeComp?.id,
      distanceComp: distanceComp?.id,
      mulComp: mulComp?.id,
      addComp: addComp?.id,
      writeComp: writeComp?.id,
      onButtonComp: onButtonComp?.id,
    });

    if (!posSourceComp?.id || !globalRefComp?.id || !originComp?.id || !subComp?.id ||
        !normalizeComp?.id || !distanceComp?.id || !mulComp?.id || !addComp?.id ||
        !writeComp?.id || !onButtonComp?.id) {
      throw new Error('Failed to find all components');
    }
    console.log('  Got all component IDs');

    // 6. 値を設定
    console.log('  Setting values...');

    // GlobalReference.Reference を Position フィールドに設定
    await client.updateComponent({
      id: globalRefComp.id,
      members: { Reference: { $type: 'reference', targetId: positionFieldId } } as any,
    });
    console.log('  Set GlobalReference to Position field');

    // ValueSource.Source を GlobalReference に設定
    await client.updateComponent({
      id: posSourceComp.id,
      members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any,
    });
    console.log('  Set ValueSource.Source to GlobalReference');

    // Origin = (0, 0, 0)
    await client.updateComponent({
      id: originComp.id,
      members: { Value: { $type: 'float3', value: { x: 0, y: 0, z: 0 } } } as any,
    });
    console.log('  Set origin: (0, 0, 0)');

    // 逃げる距離 = 0.5m
    await client.updateComponent({
      id: distanceComp.id,
      members: { Value: { $type: 'float', value: 0.5 } } as any,
    });
    console.log('  Set escape distance: 0.5m');

    // 7. 接続を設定
    console.log('  Connecting nodes...');

    // Sub.A ← PosSource (箱の位置)
    // Sub.B ← Origin (原点)
    await client.updateComponent({
      id: subComp.id,
      members: {
        A: { $type: 'reference', targetId: posSourceComp.id },
        B: { $type: 'reference', targetId: originComp.id },
      } as any,
    });
    console.log('  Connected Sub: PosSource - Origin');

    // Normalize.A ← Sub (方向ベクトル)
    await client.updateComponent({
      id: normalizeComp.id,
      members: { A: { $type: 'reference', targetId: subComp.id } } as any,
    });
    console.log('  Connected Normalize <- Sub');

    // Mul.A ← Normalize (正規化された方向)
    // Mul.B ← Distance (逃げる距離)
    await client.updateComponent({
      id: mulComp.id,
      members: {
        A: { $type: 'reference', targetId: normalizeComp.id },
        B: { $type: 'reference', targetId: distanceComp.id },
      } as any,
    });
    console.log('  Connected Mul: Normalize * Distance');

    // Add.A ← PosSource (現在位置)
    // Add.B ← Mul (移動ベクトル)
    await client.updateComponent({
      id: addComp.id,
      members: {
        A: { $type: 'reference', targetId: posSourceComp.id },
        B: { $type: 'reference', targetId: mulComp.id },
      } as any,
    });
    console.log('  Connected Add: PosSource + Mul');

    // Write.Target ← Position フィールド (直接参照)
    // Write.Value ← Add (新しい位置)
    await client.updateComponent({
      id: writeComp.id,
      members: {
        Target: { $type: 'reference', targetId: globalRefComp.id },
        Value: { $type: 'reference', targetId: addComp.id },
      } as any,
    });
    console.log('  Connected Write: Target=Position, Value=Add');

    // ButtonEvents.Pressed ← Write (トリガー接続)
    await client.updateComponent({
      id: onButtonComp.id,
      members: {
        Pressed: { $type: 'reference', targetId: writeComp.id },
      } as any,
    });
    console.log('  Connected ButtonEvents.Pressed -> Write');

    console.log('\n✨ Escape behavior added!');
    console.log('  Flow: Button -> Write -> (PosSource + Normalize(PosSource - Origin) * Distance)');
    console.log('  Note: You need to manually connect ButtonEvents.Button to TouchButton in Resonite');
    console.log('  - Open the ProtoFlux');
    console.log('  - Drag TouchButton component to ButtonEvents.Button input');

  } finally {
    client.disconnect();
  }
}

main().catch(console.error);
