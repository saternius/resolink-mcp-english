/**
 * じゃんけんゲーム作成スクリプト（動作確認済み版）
 * UIX + ProtoFlux でじゃんけんゲームを構築
 *
 * 各ボタンに対して：
 * 1. プレイヤーの手を表示
 * 2. CPUの手をランダム生成
 * 3. 結果を計算して表示
 *
 * 使い方: npx tsx src/scripts/create-janken.ts [ws://localhost:33333]
 */
import { ResoniteLinkClient } from '../client.js';

const WS_URL = process.argv[2] || 'ws://localhost:33333';

// ヘルパー: コンポーネントを探す
function findComponent(data: any, typeIncludes: string, exclude?: string) {
  return data?.components?.find((c: any) => {
    const typeStr = c.type || c.componentType || '';
    const match = typeStr.includes(typeIncludes);
    if (exclude) return match && !typeStr.includes(exclude);
    return match;
  });
}

// ヘルパー: 複数のコンポーネントを探す
function findComponents(data: any, typeIncludes: string, exclude?: string) {
  return data?.components?.filter((c: any) => {
    const typeStr = c.type || c.componentType || '';
    const match = typeStr.includes(typeIncludes);
    if (exclude) return match && !typeStr.includes(exclude);
    return match;
  }) || [];
}

// ヘルパー: スロットIDを取得
async function getChildSlotId(client: ResoniteLinkClient, parentId: string, name: string): Promise<string> {
  const data = await client.getSlot({ slotId: parentId, depth: 1 });
  const child = data.data?.children?.find((c: any) => c.name?.value === name);
  if (!child?.id) throw new Error(`Child slot "${name}" not found in ${parentId}`);
  return child.id;
}

async function main() {
  const client = new ResoniteLinkClient({ url: WS_URL });
  await client.connect();

  try {
    console.log('Creating Janken (Rock-Paper-Scissors) Game...\n');

    // ========== 1. メインスロット作成 ==========
    const slotName = `JankenGame_${Date.now()}`;
    await client.addSlot({
      name: slotName,
      position: { x: 0, y: 1.5, z: 1.5 },
      isActive: true,
    });

    const mainSlot = await client.findSlotByName(slotName, 'Root', 1);
    if (!mainSlot?.id) throw new Error('Main slot not found');
    const mainId = mainSlot.id;
    console.log(`Main slot: ${mainId}`);

    // UIXスケール設定
    await client.updateSlot({
      id: mainId,
      scale: { x: 0.001, y: 0.001, z: 0.001 },
    });

    // ========== 2. Canvas + UI_UnlitMaterial ==========
    await client.addComponent({ containerSlotId: mainId, componentType: '[FrooxEngine]FrooxEngine.UIX.Canvas' });
    await client.addComponent({ containerSlotId: mainId, componentType: '[FrooxEngine]FrooxEngine.Grabbable' });
    await client.addComponent({ containerSlotId: mainId, componentType: '[FrooxEngine]FrooxEngine.UI_UnlitMaterial' });

    let mainData = await client.getSlot({ slotId: mainId, includeComponentData: true });
    const canvas = findComponent(mainData.data, 'Canvas');
    const uiMaterial = findComponent(mainData.data, 'UI_UnlitMaterial');

    if (canvas?.id) {
      await client.updateComponent({
        id: canvas.id,
        members: { Size: { $type: 'float2', value: { x: 420, y: 380 } } } as any,
      });
    }
    if (uiMaterial?.id) {
      await client.updateComponent({
        id: uiMaterial.id,
        members: {
          ZWrite: { $type: 'enum', value: 'On', enumType: 'ZWrite' },
          OffsetFactor: { $type: 'float', value: 1 },
          OffsetUnits: { $type: 'float', value: 100 },
          Sidedness: { $type: 'enum', value: 'Double', enumType: 'Sidedness' },
        } as any,
      });
    }
    console.log('  Canvas created');

    // ========== 3. GameState スロット ==========
    await client.addSlot({ parentId: mainId, name: 'GameState' });
    const gameStateId = await getChildSlotId(client, mainId, 'GameState');

    // playerHand, cpuHand, resultText, cpuRandomValue (int)
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' });
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' });
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' });
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<int>' });

    let gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
    const stringFields = findComponents(gameStateData.data, 'ValueField<string>');
    const intFields = findComponents(gameStateData.data, 'ValueField<int>');
    const playerHandField = stringFields[0];
    const cpuHandField = stringFields[1];
    const resultTextField = stringFields[2];
    const cpuRandomField = intFields[0];

    // 初期値設定
    if (playerHandField?.id) {
      await client.updateComponent({ id: playerHandField.id, members: { Value: { $type: 'string', value: '❓' } } as any });
    }
    if (cpuHandField?.id) {
      await client.updateComponent({ id: cpuHandField.id, members: { Value: { $type: 'string', value: '❓' } } as any });
    }
    if (resultTextField?.id) {
      await client.updateComponent({ id: resultTextField.id, members: { Value: { $type: 'string', value: '手を選んでね！' } } as any });
    }
    if (cpuRandomField?.id) {
      await client.updateComponent({ id: cpuRandomField.id, members: { Value: { $type: 'int', value: 0 } } as any });
    }
    console.log(`  GameState fields created`);

    // ========== 4. 背景 ==========
    await client.addSlot({ parentId: mainId, name: 'Background' });
    const bgId = await getChildSlotId(client, mainId, 'Background');

    await client.addComponent({ containerSlotId: bgId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: bgId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });

    let bgData = await client.getSlot({ slotId: bgId, includeComponentData: true });
    const bgRect = findComponent(bgData.data, 'RectTransform');
    const bgImage = findComponent(bgData.data, 'Image');

    if (bgRect?.id) {
      await client.updateComponent({
        id: bgRect.id,
        members: {
          AnchorMin: { $type: 'float2', value: { x: 0, y: 0 } },
          AnchorMax: { $type: 'float2', value: { x: 1, y: 1 } },
        } as any,
      });
    }
    if (bgImage?.id) {
      await client.updateComponent({
        id: bgImage.id,
        members: {
          Tint: { $type: 'colorX', value: { r: 0.08, g: 0.1, b: 0.15, a: 0.98 } },
          Material: { $type: 'reference', targetId: uiMaterial?.id },
        } as any,
      });
    }
    console.log('  Background created');

    // ========== 5. Content (VerticalLayout) ==========
    await client.addSlot({ parentId: mainId, name: 'Content' });
    const contentId = await getChildSlotId(client, mainId, 'Content');

    await client.addComponent({ containerSlotId: contentId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: contentId, componentType: '[FrooxEngine]FrooxEngine.UIX.VerticalLayout' });

    let contentData = await client.getSlot({ slotId: contentId, includeComponentData: true });
    const contentRect = findComponent(contentData.data, 'RectTransform');
    const vLayout = findComponent(contentData.data, 'VerticalLayout');

    if (contentRect?.id) {
      await client.updateComponent({
        id: contentRect.id,
        members: {
          AnchorMin: { $type: 'float2', value: { x: 0, y: 0 } },
          AnchorMax: { $type: 'float2', value: { x: 1, y: 1 } },
          OffsetMin: { $type: 'float2', value: { x: 20, y: 20 } },
          OffsetMax: { $type: 'float2', value: { x: -20, y: -20 } },
        } as any,
      });
    }
    if (vLayout?.id) {
      await client.updateComponent({
        id: vLayout.id,
        members: {
          Spacing: { $type: 'float', value: 12 },
          ForceExpandWidth: { $type: 'bool', value: true },
          ForceExpandHeight: { $type: 'bool', value: false },
        } as any,
      });
    }

    // ========== 6. Header ==========
    await client.addSlot({ parentId: contentId, name: 'Header' });
    const headerId = await getChildSlotId(client, contentId, 'Header');

    await client.addComponent({ containerSlotId: headerId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: headerId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: headerId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

    let headerData = await client.getSlot({ slotId: headerId, includeComponentData: true });
    const headerLayout = findComponent(headerData.data, 'LayoutElement');
    const headerText = findComponent(headerData.data, 'Text', 'TextField');

    if (headerLayout?.id) {
      await client.updateComponent({
        id: headerLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 50 } } as any,
      });
    }
    if (headerText?.id) {
      await client.updateComponent({
        id: headerText.id,
        members: {
          Content: { $type: 'string', value: 'じゃんけん' },
          Size: { $type: 'float', value: 32 },
          Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
        } as any,
      });
    }
    console.log('  Header created');

    // ========== 7. HandsDisplay (対戦表示) ==========
    await client.addSlot({ parentId: contentId, name: 'HandsDisplay' });
    const handsDisplayId = await getChildSlotId(client, contentId, 'HandsDisplay');

    await client.addComponent({ containerSlotId: handsDisplayId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: handsDisplayId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: handsDisplayId, componentType: '[FrooxEngine]FrooxEngine.UIX.HorizontalLayout' });

    let handsData = await client.getSlot({ slotId: handsDisplayId, includeComponentData: true });
    const handsLayout = findComponent(handsData.data, 'LayoutElement');
    const handsHLayout = findComponent(handsData.data, 'HorizontalLayout');

    if (handsLayout?.id) {
      await client.updateComponent({
        id: handsLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 100 } } as any,
      });
    }
    if (handsHLayout?.id) {
      await client.updateComponent({
        id: handsHLayout.id,
        members: {
          Spacing: { $type: 'float', value: 20 },
          ForceExpandWidth: { $type: 'bool', value: true },
          ForceExpandHeight: { $type: 'bool', value: true },
        } as any,
      });
    }

    // PlayerHand
    await client.addSlot({ parentId: handsDisplayId, name: 'PlayerHand' });
    const playerHandSlotId = await getChildSlotId(client, handsDisplayId, 'PlayerHand');

    await client.addComponent({ containerSlotId: playerHandSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: playerHandSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: playerHandSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

    let playerHandData = await client.getSlot({ slotId: playerHandSlotId, includeComponentData: true });
    const playerHandLayout = findComponent(playerHandData.data, 'LayoutElement');
    const playerHandText = findComponent(playerHandData.data, 'Text', 'TextField');

    if (playerHandLayout?.id) {
      await client.updateComponent({
        id: playerHandLayout.id,
        members: { FlexibleWidth: { $type: 'float', value: 1 } } as any,
      });
    }
    if (playerHandText?.id) {
      await client.updateComponent({
        id: playerHandText.id,
        members: {
          Content: { $type: 'string', value: '❓' },
          Size: { $type: 'float', value: 64 },
          Color: { $type: 'colorX', value: { r: 0.5, g: 0.8, b: 1, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
          VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
        } as any,
      });
    }

    // VS text
    await client.addSlot({ parentId: handsDisplayId, name: 'VS' });
    const vsId = await getChildSlotId(client, handsDisplayId, 'VS');

    await client.addComponent({ containerSlotId: vsId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: vsId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: vsId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

    let vsData = await client.getSlot({ slotId: vsId, includeComponentData: true });
    const vsLayout = findComponent(vsData.data, 'LayoutElement');
    const vsText = findComponent(vsData.data, 'Text', 'TextField');

    if (vsLayout?.id) {
      await client.updateComponent({
        id: vsLayout.id,
        members: { PreferredWidth: { $type: 'float', value: 60 } } as any,
      });
    }
    if (vsText?.id) {
      await client.updateComponent({
        id: vsText.id,
        members: {
          Content: { $type: 'string', value: 'VS' },
          Size: { $type: 'float', value: 28 },
          Color: { $type: 'colorX', value: { r: 1, g: 0.8, b: 0.3, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
          VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
        } as any,
      });
    }

    // CpuHand
    await client.addSlot({ parentId: handsDisplayId, name: 'CpuHand' });
    const cpuHandSlotId = await getChildSlotId(client, handsDisplayId, 'CpuHand');

    await client.addComponent({ containerSlotId: cpuHandSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: cpuHandSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: cpuHandSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

    let cpuHandData = await client.getSlot({ slotId: cpuHandSlotId, includeComponentData: true });
    const cpuHandLayout = findComponent(cpuHandData.data, 'LayoutElement');
    const cpuHandText = findComponent(cpuHandData.data, 'Text', 'TextField');

    if (cpuHandLayout?.id) {
      await client.updateComponent({
        id: cpuHandLayout.id,
        members: { FlexibleWidth: { $type: 'float', value: 1 } } as any,
      });
    }
    if (cpuHandText?.id) {
      await client.updateComponent({
        id: cpuHandText.id,
        members: {
          Content: { $type: 'string', value: '❓' },
          Size: { $type: 'float', value: 64 },
          Color: { $type: 'colorX', value: { r: 1, g: 0.5, b: 0.5, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
          VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
        } as any,
      });
    }
    console.log('  HandsDisplay created');

    // ========== 8. ResultText ==========
    await client.addSlot({ parentId: contentId, name: 'ResultText' });
    const resultTextSlotId = await getChildSlotId(client, contentId, 'ResultText');

    await client.addComponent({ containerSlotId: resultTextSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: resultTextSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: resultTextSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

    let resultTextData = await client.getSlot({ slotId: resultTextSlotId, includeComponentData: true });
    const resultTextLayout = findComponent(resultTextData.data, 'LayoutElement');
    const resultTextComp = findComponent(resultTextData.data, 'Text', 'TextField');

    if (resultTextLayout?.id) {
      await client.updateComponent({
        id: resultTextLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 45 } } as any,
      });
    }
    if (resultTextComp?.id) {
      await client.updateComponent({
        id: resultTextComp.id,
        members: {
          Content: { $type: 'string', value: '手を選んでね！' },
          Size: { $type: 'float', value: 26 },
          Color: { $type: 'colorX', value: { r: 0.9, g: 0.9, b: 0.9, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
        } as any,
      });
    }
    console.log('  ResultText created');

    // ========== 9. Buttons (HorizontalLayout) ==========
    await client.addSlot({ parentId: contentId, name: 'Buttons' });
    const buttonsId = await getChildSlotId(client, contentId, 'Buttons');

    await client.addComponent({ containerSlotId: buttonsId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: buttonsId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: buttonsId, componentType: '[FrooxEngine]FrooxEngine.UIX.HorizontalLayout' });

    let buttonsData = await client.getSlot({ slotId: buttonsId, includeComponentData: true });
    const buttonsLayout = findComponent(buttonsData.data, 'LayoutElement');
    const buttonsHLayout = findComponent(buttonsData.data, 'HorizontalLayout');

    if (buttonsLayout?.id) {
      await client.updateComponent({
        id: buttonsLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 80 } } as any,
      });
    }
    if (buttonsHLayout?.id) {
      await client.updateComponent({
        id: buttonsHLayout.id,
        members: {
          Spacing: { $type: 'float', value: 15 },
          ForceExpandWidth: { $type: 'bool', value: true },
          ForceExpandHeight: { $type: 'bool', value: true },
        } as any,
      });
    }

    // ボタン作成関数
    const createButton = async (name: string, label: string, tag: string, color: { r: number; g: number; b: number }) => {
      await client.addSlot({ parentId: buttonsId, name });
      const btnId = await getChildSlotId(client, buttonsId, name);

      await client.addComponent({ containerSlotId: btnId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
      await client.addComponent({ containerSlotId: btnId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
      await client.addComponent({ containerSlotId: btnId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });
      await client.addComponent({ containerSlotId: btnId, componentType: '[FrooxEngine]FrooxEngine.UIX.Button' });
      await client.addComponent({ containerSlotId: btnId, componentType: '[FrooxEngine]FrooxEngine.ButtonDynamicImpulseTrigger' });

      let btnData = await client.getSlot({ slotId: btnId, includeComponentData: true });
      const btnLayout = findComponent(btnData.data, 'LayoutElement');
      const btnImage = findComponent(btnData.data, 'Image');
      const btnTrigger = findComponent(btnData.data, 'ButtonDynamicImpulseTrigger');

      if (btnLayout?.id) {
        await client.updateComponent({
          id: btnLayout.id,
          members: { FlexibleWidth: { $type: 'float', value: 1 } } as any,
        });
      }
      if (btnImage?.id) {
        await client.updateComponent({
          id: btnImage.id,
          members: { Tint: { $type: 'colorX', value: { ...color, a: 1 } } } as any,
        });
      }
      if (btnTrigger?.id) {
        await client.updateComponent({
          id: btnTrigger.id,
          members: {
            PressedTag: { $type: 'string', value: tag },
            Target: { $type: 'reference', targetId: mainId },
          } as any,
        });
      }

      // ボタンテキスト
      await client.addSlot({ parentId: btnId, name: 'Text' });
      const textSlotId = await getChildSlotId(client, btnId, 'Text');

      await client.addComponent({ containerSlotId: textSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
      await client.addComponent({ containerSlotId: textSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

      let textData = await client.getSlot({ slotId: textSlotId, includeComponentData: true });
      const textRect = findComponent(textData.data, 'RectTransform');
      const textComp = findComponent(textData.data, 'Text', 'TextField');

      if (textRect?.id) {
        await client.updateComponent({
          id: textRect.id,
          members: {
            AnchorMin: { $type: 'float2', value: { x: 0, y: 0 } },
            AnchorMax: { $type: 'float2', value: { x: 1, y: 1 } },
          } as any,
        });
      }
      if (textComp?.id) {
        await client.updateComponent({
          id: textComp.id,
          members: {
            Content: { $type: 'string', value: label },
            Size: { $type: 'float', value: 36 },
            Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
            HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
            VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
          } as any,
        });
      }

      return btnId;
    };

    // 3つのボタンを作成
    await createButton('RockButton', 'グー', 'Janken_Rock', { r: 0.6, g: 0.3, b: 0.3 });
    await createButton('ScissorsButton', 'チョキ', 'Janken_Scissors', { r: 0.3, g: 0.5, b: 0.3 });
    await createButton('PaperButton', 'パー', 'Janken_Paper', { r: 0.3, g: 0.3, b: 0.6 });
    console.log('  Buttons created (Rock, Scissors, Paper)');

    // ========== 10. ValueDriver でテキストをドライブ ==========
    // PlayerHand Text ← playerHandField
    if (playerHandField?.id && playerHandText?.id) {
      await client.addComponent({
        containerSlotId: gameStateId,
        componentType: '[FrooxEngine]FrooxEngine.ValueDriver<string>',
      });
      gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
      const drives = findComponents(gameStateData.data, 'ValueDriver');
      const drive = drives[drives.length - 1];

      if (drive?.id) {
        const playerHandTextDetails = await client.getComponent(playerHandText.id);
        const contentFieldId = playerHandTextDetails.data?.members?.Content?.id;
        const playerHandFieldDetails = await client.getComponent(playerHandField.id);
        const playerValueId = playerHandFieldDetails.data?.members?.Value?.id;
        const driveDetails = await client.getComponent(drive.id);
        const driveTargetId = driveDetails.data?.members?.DriveTarget?.id;

        await client.updateComponent({
          id: drive.id,
          members: {
            ValueSource: { $type: 'reference', targetId: playerValueId },
            DriveTarget: { $type: 'reference', id: driveTargetId, targetId: contentFieldId },
          } as any,
        });
      }
    }

    // CpuHand Text ← cpuHandField
    if (cpuHandField?.id && cpuHandText?.id) {
      await client.addComponent({
        containerSlotId: gameStateId,
        componentType: '[FrooxEngine]FrooxEngine.ValueDriver<string>',
      });
      gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
      const drives = findComponents(gameStateData.data, 'ValueDriver');
      const drive = drives[drives.length - 1];

      if (drive?.id) {
        const cpuHandTextDetails = await client.getComponent(cpuHandText.id);
        const contentFieldId = cpuHandTextDetails.data?.members?.Content?.id;
        const cpuHandFieldDetails = await client.getComponent(cpuHandField.id);
        const cpuValueId = cpuHandFieldDetails.data?.members?.Value?.id;
        const driveDetails = await client.getComponent(drive.id);
        const driveTargetId = driveDetails.data?.members?.DriveTarget?.id;

        await client.updateComponent({
          id: drive.id,
          members: {
            ValueSource: { $type: 'reference', targetId: cpuValueId },
            DriveTarget: { $type: 'reference', id: driveTargetId, targetId: contentFieldId },
          } as any,
        });
      }
    }

    // ResultText ← resultTextField
    if (resultTextField?.id && resultTextComp?.id) {
      await client.addComponent({
        containerSlotId: gameStateId,
        componentType: '[FrooxEngine]FrooxEngine.ValueDriver<string>',
      });
      gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
      const drives = findComponents(gameStateData.data, 'ValueDriver');
      const drive = drives[drives.length - 1];

      if (drive?.id) {
        const resultTextCompDetails = await client.getComponent(resultTextComp.id);
        const contentFieldId = resultTextCompDetails.data?.members?.Content?.id;
        const resultTextFieldDetails = await client.getComponent(resultTextField.id);
        const resultValueId = resultTextFieldDetails.data?.members?.Value?.id;
        const driveDetails = await client.getComponent(drive.id);
        const driveTargetId = driveDetails.data?.members?.DriveTarget?.id;

        await client.updateComponent({
          id: drive.id,
          members: {
            ValueSource: { $type: 'reference', targetId: resultValueId },
            DriveTarget: { $type: 'reference', id: driveTargetId, targetId: contentFieldId },
          } as any,
        });
      }
    }
    console.log('  ValueDrivers connected');

    // ========== 11. ProtoFlux (完全版: プレイヤーの手 + CPUのランダム手 + 結果判定) ==========
    await client.addSlot({ parentId: mainId, name: 'Flux' });
    const fluxId = await getChildSlotId(client, mainId, 'Flux');

    // 手の配列: 0=グー, 1=チョキ, 2=パー
    const hands = ['グー', 'チョキ', 'パー'];
    const handTags = ['Janken_Rock', 'Janken_Scissors', 'Janken_Paper'];

    // 勝敗テーブル: resultTable[playerIdx][cpuIdx]
    // グー(0)がチョキ(1)に勝ち、チョキ(1)がパー(2)に勝ち、パー(2)がグー(0)に勝ち
    const resultTable = [
      ['あいこ！', '勝ち！🎉', '負け...'],   // プレイヤーがグー: CPU=グー→あいこ, CPU=チョキ→勝ち, CPU=パー→負け
      ['負け...', 'あいこ！', '勝ち！🎉'],   // プレイヤーがチョキ: CPU=グー→負け, CPU=チョキ→あいこ, CPU=パー→勝ち
      ['勝ち！🎉', '負け...', 'あいこ！'],   // プレイヤーがパー: CPU=グー→勝ち, CPU=チョキ→負け, CPU=パー→あいこ
    ];

    // 各手用のProtoFluxロジック
    for (let playerHandIdx = 0; playerHandIdx < 3; playerHandIdx++) {
      const handName = handTags[playerHandIdx].replace('Janken_', '');
      const playerHandEmoji = hands[playerHandIdx];

      // 各手用のProtoFluxスロット
      await client.addSlot({
        parentId: fluxId,
        name: `${handName}Logic`,
        position: { x: (playerHandIdx - 1) * 3.0, y: 0, z: 0 },
      });
      const logicId = await getChildSlotId(client, fluxId, `${handName}Logic`);

      // ノード用スロット作成
      await client.addSlot({ parentId: logicId, name: 'Receiver' });
      await client.addSlot({ parentId: logicId, name: 'TagInput' });
      await client.addSlot({ parentId: logicId, name: 'PlayerHandInput' });
      await client.addSlot({ parentId: logicId, name: 'PlayerWrite' });
      await client.addSlot({ parentId: logicId, name: 'Random' });
      await client.addSlot({ parentId: logicId, name: 'RandomWrite' });  // ランダム値を保存
      await client.addSlot({ parentId: logicId, name: 'RandomSource' }); // 保存された値を読み取り
      await client.addSlot({ parentId: logicId, name: 'CpuHand0' });
      await client.addSlot({ parentId: logicId, name: 'CpuHand1' });
      await client.addSlot({ parentId: logicId, name: 'CpuHand2' });
      await client.addSlot({ parentId: logicId, name: 'CpuWrite' });
      await client.addSlot({ parentId: logicId, name: 'Result0' });
      await client.addSlot({ parentId: logicId, name: 'Result1' });
      await client.addSlot({ parentId: logicId, name: 'Result2' });
      await client.addSlot({ parentId: logicId, name: 'ResultWrite' });
      await client.addSlot({ parentId: logicId, name: 'Equals0' });
      await client.addSlot({ parentId: logicId, name: 'Equals1' });
      await client.addSlot({ parentId: logicId, name: 'Cond0' });
      await client.addSlot({ parentId: logicId, name: 'Cond1' });
      await client.addSlot({ parentId: logicId, name: 'CondResult0' });
      await client.addSlot({ parentId: logicId, name: 'CondResult1' });
      await client.addSlot({ parentId: logicId, name: 'Const0' });
      await client.addSlot({ parentId: logicId, name: 'Const1' });

      const logicData = await client.getSlot({ slotId: logicId, depth: 1 });
      const getNodeSlotId = (name: string) => logicData.data?.children?.find((c: any) => c.name?.value === name)?.id;

      const receiverSlotId = getNodeSlotId('Receiver');
      const tagInputSlotId = getNodeSlotId('TagInput');
      const playerHandInputSlotId = getNodeSlotId('PlayerHandInput');
      const playerWriteSlotId = getNodeSlotId('PlayerWrite');
      const randomSlotId = getNodeSlotId('Random');
      const randomWriteSlotId = getNodeSlotId('RandomWrite');
      const randomSourceSlotId = getNodeSlotId('RandomSource');
      const cpuHand0SlotId = getNodeSlotId('CpuHand0');
      const cpuHand1SlotId = getNodeSlotId('CpuHand1');
      const cpuHand2SlotId = getNodeSlotId('CpuHand2');
      const cpuWriteSlotId = getNodeSlotId('CpuWrite');
      const result0SlotId = getNodeSlotId('Result0');
      const result1SlotId = getNodeSlotId('Result1');
      const result2SlotId = getNodeSlotId('Result2');
      const resultWriteSlotId = getNodeSlotId('ResultWrite');
      const equals0SlotId = getNodeSlotId('Equals0');
      const equals1SlotId = getNodeSlotId('Equals1');
      const cond0SlotId = getNodeSlotId('Cond0');
      const cond1SlotId = getNodeSlotId('Cond1');
      const condResult0SlotId = getNodeSlotId('CondResult0');
      const condResult1SlotId = getNodeSlotId('CondResult1');
      const const0SlotId = getNodeSlotId('Const0');
      const const1SlotId = getNodeSlotId('Const1');

      // コンポーネント追加
      // DynamicImpulseReceiver
      await client.addComponent({ containerSlotId: receiverSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver' });
      // GlobalValue<string> for Tag
      await client.addComponent({ containerSlotId: tagInputSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>' });
      // プレーヤーの手入力
      await client.addComponent({ containerSlotId: playerHandInputSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
      
      // PlayerWrite: ObjectValueSource + GlobalReference + ObjectWrite
      await client.addComponent({ containerSlotId: playerWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: playerWriteSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>' });
      await client.addComponent({ containerSlotId: playerWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });

      // Random_Int (0-3)
      await client.addComponent({ containerSlotId: randomSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Math.Random.RandomInt' });
      await client.addComponent({ containerSlotId: randomSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<int>' });
      await client.addComponent({ containerSlotId: randomSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<int>' });

      // RandomWrite: ランダム値をValueField<int>に保存
      await client.addComponent({ containerSlotId: randomWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<int>' });
      await client.addComponent({ containerSlotId: randomWriteSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<int>>' });
      await client.addComponent({ containerSlotId: randomWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,int>' });

      // RandomSource: 保存されたランダム値を読み取り
      await client.addComponent({ containerSlotId: randomSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<int>' });
      await client.addComponent({ containerSlotId: randomSourceSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<int>>' });

      // CPU手の入力（3つ）
      await client.addComponent({ containerSlotId: cpuHand0SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
      await client.addComponent({ containerSlotId: cpuHand1SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
      await client.addComponent({ containerSlotId: cpuHand2SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });

      // 結果の入力（3つ）
      await client.addComponent({ containerSlotId: result0SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
      await client.addComponent({ containerSlotId: result1SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
      await client.addComponent({ containerSlotId: result2SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });

      // 比較用の定数 (0, 1)
      await client.addComponent({ containerSlotId: const0SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<int>' });
      await client.addComponent({ containerSlotId: const1SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<int>' });

      // Equals (randomSource == 0, randomSource == 1)
      await client.addComponent({ containerSlotId: equals0SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueEquals<int>' });
      await client.addComponent({ containerSlotId: equals1SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueEquals<int>' });

      // ObjectConditional (CPU手選択)
      await client.addComponent({ containerSlotId: cond0SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectConditional<string>' });
      await client.addComponent({ containerSlotId: cond1SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectConditional<string>' });

      // ObjectConditional (結果選択)
      await client.addComponent({ containerSlotId: condResult0SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectConditional<string>' });
      await client.addComponent({ containerSlotId: condResult1SlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectConditional<string>' });

      // CpuWrite: ObjectValueSource + GlobalReference + ObjectWrite
      await client.addComponent({ containerSlotId: cpuWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: cpuWriteSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>' });
      await client.addComponent({ containerSlotId: cpuWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });

      // ResultWrite: ObjectValueSource + GlobalReference + ObjectWrite
      await client.addComponent({ containerSlotId: resultWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: resultWriteSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>' });
      await client.addComponent({ containerSlotId: resultWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });

      // 少し待ってからコンポーネント取得
      await new Promise(resolve => setTimeout(resolve, 150));

      // コンポーネント取得
      const getComp = async (slotId: string, typeIncludes: string) => {
        const data = await client.getSlot({ slotId, includeComponentData: true });
        return findComponent(data.data, typeIncludes);
      };
      const getComps = async (slotId: string, typeIncludes: string) => {
        const data = await client.getSlot({ slotId, includeComponentData: true });
        return findComponents(data.data, typeIncludes);
      };

      const receiverComp = await getComp(receiverSlotId, 'DynamicImpulseReceiver');
      const tagInputComp = await getComp(tagInputSlotId, 'GlobalValue');
      const playerHandInputComp = await getComp(playerHandInputSlotId, 'ValueObjectInput');
      const playerSource = await getComp(playerWriteSlotId, 'ObjectValueSource');
      const playerGlobalRef = await getComp(playerWriteSlotId, 'GlobalReference');
      const playerWrite = await getComp(playerWriteSlotId, 'ObjectWrite');

      const randomComp = await getComp(randomSlotId, 'RandomInt');
      const randomInputs = await getComps(randomSlotId, 'ValueInput');

      // RandomWrite のコンポーネント取得
      const randomWriteSource = await getComp(randomWriteSlotId, 'ValueSource');
      const randomWriteGlobalRef = await getComp(randomWriteSlotId, 'GlobalReference');
      const randomWriteComp = await getComp(randomWriteSlotId, 'ValueWrite');

      // RandomSource のコンポーネント取得
      const randomSourceComp = await getComp(randomSourceSlotId, 'ValueSource');
      const randomSourceGlobalRef = await getComp(randomSourceSlotId, 'GlobalReference');
      
      const cpuHand0Comp = await getComp(cpuHand0SlotId, 'ValueObjectInput');
      const cpuHand1Comp = await getComp(cpuHand1SlotId, 'ValueObjectInput');
      const cpuHand2Comp = await getComp(cpuHand2SlotId, 'ValueObjectInput');

      const result0Comp = await getComp(result0SlotId, 'ValueObjectInput');
      const result1Comp = await getComp(result1SlotId, 'ValueObjectInput');
      const result2Comp = await getComp(result2SlotId, 'ValueObjectInput');

      const const0Comp = await getComp(const0SlotId, 'ValueInput');
      const const1Comp = await getComp(const1SlotId, 'ValueInput');

      const equals0Comp = await getComp(equals0SlotId, 'ValueEquals');
      const equals1Comp = await getComp(equals1SlotId, 'ValueEquals');

      const cond0Comp = await getComp(cond0SlotId, 'ObjectConditional');
      const cond1Comp = await getComp(cond1SlotId, 'ObjectConditional');

      const condResult0Comp = await getComp(condResult0SlotId, 'ObjectConditional');
      const condResult1Comp = await getComp(condResult1SlotId, 'ObjectConditional');

      const cpuSource = await getComp(cpuWriteSlotId, 'ObjectValueSource');
      const cpuGlobalRef = await getComp(cpuWriteSlotId, 'GlobalReference');
      const cpuWrite = await getComp(cpuWriteSlotId, 'ObjectWrite');

      const resultSource = await getComp(resultWriteSlotId, 'ObjectValueSource');
      const resultGlobalRef = await getComp(resultWriteSlotId, 'GlobalReference');
      const resultWrite = await getComp(resultWriteSlotId, 'ObjectWrite');

      // === 値設定 ===
      // Tag設定
      if (tagInputComp?.id) {
        await client.updateComponent({ id: tagInputComp.id, members: { Value: { $type: 'string', value: handTags[playerHandIdx] } } as any });
      }
      if (receiverComp?.id && tagInputComp?.id) {
        await client.updateComponent({
          id: receiverComp.id,
          members: { Tag: { $type: 'reference', targetId: tagInputComp.id } } as any,
        });
      }

      // プレーヤーの手入力
      if (playerHandInputComp?.id) {
        await client.updateComponent({ id: playerHandInputComp.id, members: { Value: { $type: 'string', value: playerHandEmoji } } as any });
      }

      // Random範囲: min=0, max=3
      if (randomInputs[0]?.id) {
        await client.updateComponent({ id: randomInputs[0].id, members: { Value: { $type: 'int', value: 0 } } as any });
      }
      if (randomInputs[1]?.id) {
        await client.updateComponent({ id: randomInputs[1].id, members: { Value: { $type: 'int', value: 3 } } as any });
      }
      if (randomComp?.id && randomInputs[0]?.id && randomInputs[1]?.id) {
        await client.updateComponent({
          id: randomComp.id,
          members: {
            Min: { $type: 'reference', targetId: randomInputs[0].id },
            Max: { $type: 'reference', targetId: randomInputs[1].id },
          } as any,
        });
      }

      // === RandomWrite 設定: ランダム値をcpuRandomFieldに保存 ===
      if (cpuRandomField?.id && randomWriteGlobalRef?.id) {
        const fieldDetails = await client.getComponent(cpuRandomField.id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (valueId) {
          await client.updateComponent({
            id: randomWriteGlobalRef.id,
            members: { Reference: { $type: 'reference', targetId: valueId } } as any,
          });
        }
      }
      if (randomWriteSource?.id && randomWriteGlobalRef?.id) {
        await client.updateComponent({
          id: randomWriteSource.id,
          members: { Source: { $type: 'reference', targetId: randomWriteGlobalRef.id } } as any,
        });
      }
      if (randomWriteComp?.id && randomWriteSource?.id && randomComp?.id) {
        await client.updateComponent({
          id: randomWriteComp.id,
          members: {
            Variable: { $type: 'reference', targetId: randomWriteSource.id },
            Value: { $type: 'reference', targetId: randomComp.id },
          } as any,
        });
      }

      // === RandomSource 設定: 保存されたランダム値を読み取り ===
      if (cpuRandomField?.id && randomSourceGlobalRef?.id) {
        const fieldDetails = await client.getComponent(cpuRandomField.id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (valueId) {
          await client.updateComponent({
            id: randomSourceGlobalRef.id,
            members: { Reference: { $type: 'reference', targetId: valueId } } as any,
          });
        }
      }
      if (randomSourceComp?.id && randomSourceGlobalRef?.id) {
        await client.updateComponent({
          id: randomSourceComp.id,
          members: { Source: { $type: 'reference', targetId: randomSourceGlobalRef.id } } as any,
        });
      }

      // CPU手の文字列設定
      if (cpuHand0Comp?.id) await client.updateComponent({ id: cpuHand0Comp.id, members: { Value: { $type: 'string', value: hands[0] } } as any });
      if (cpuHand1Comp?.id) await client.updateComponent({ id: cpuHand1Comp.id, members: { Value: { $type: 'string', value: hands[1] } } as any });
      if (cpuHand2Comp?.id) await client.updateComponent({ id: cpuHand2Comp.id, members: { Value: { $type: 'string', value: hands[2] } } as any });

      // 結果の文字列設定
      if (result0Comp?.id) await client.updateComponent({ id: result0Comp.id, members: { Value: { $type: 'string', value: resultTable[playerHandIdx][0] } } as any });
      if (result1Comp?.id) await client.updateComponent({ id: result1Comp.id, members: { Value: { $type: 'string', value: resultTable[playerHandIdx][1] } } as any });
      if (result2Comp?.id) await client.updateComponent({ id: result2Comp.id, members: { Value: { $type: 'string', value: resultTable[playerHandIdx][2] } } as any });

      // 定数設定
      if (const0Comp?.id) await client.updateComponent({ id: const0Comp.id, members: { Value: { $type: 'int', value: 0 } } as any });
      if (const1Comp?.id) await client.updateComponent({ id: const1Comp.id, members: { Value: { $type: 'int', value: 1 } } as any });

      // === 接続設定 ===
      // Equals: randomSource == 0, randomSource == 1 (Randomではなく保存されたRandomSourceを使用)
      if (equals0Comp?.id && randomSourceComp?.id && const0Comp?.id) {
        await client.updateComponent({
          id: equals0Comp.id,
          members: {
            A: { $type: 'reference', targetId: randomSourceComp.id },
            B: { $type: 'reference', targetId: const0Comp.id },
          } as any,
        });
      }
      if (equals1Comp?.id && randomSourceComp?.id && const1Comp?.id) {
        await client.updateComponent({
          id: equals1Comp.id,
          members: {
            A: { $type: 'reference', targetId: randomSourceComp.id },
            B: { $type: 'reference', targetId: const1Comp.id },
          } as any,
        });
      }

      // Conditional for CPU hand: cond1 = (rand==1) ? hand1 : hand2, cond0 = (rand==0) ? hand0 : cond1
      if (cond1Comp?.id && equals1Comp?.id && cpuHand1Comp?.id && cpuHand2Comp?.id) {
        await client.updateComponent({
          id: cond1Comp.id,
          members: {
            Condition: { $type: 'reference', targetId: equals1Comp.id },
            OnTrue: { $type: 'reference', targetId: cpuHand1Comp.id },
            OnFalse: { $type: 'reference', targetId: cpuHand2Comp.id },
          } as any,
        });
      }
      if (cond0Comp?.id && equals0Comp?.id && cpuHand0Comp?.id && cond1Comp?.id) {
        await client.updateComponent({
          id: cond0Comp.id,
          members: {
            Condition: { $type: 'reference', targetId: equals0Comp.id },
            OnTrue: { $type: 'reference', targetId: cpuHand0Comp.id },
            OnFalse: { $type: 'reference', targetId: cond1Comp.id },
          } as any,
        });
      }

      // Conditional for Result: condResult1 = (rand==1) ? result1 : result2, condResult0 = (rand==0) ? result0 : condResult1
      if (condResult1Comp?.id && equals1Comp?.id && result1Comp?.id && result2Comp?.id) {
        await client.updateComponent({
          id: condResult1Comp.id,
          members: {
            Condition: { $type: 'reference', targetId: equals1Comp.id },
            OnTrue: { $type: 'reference', targetId: result1Comp.id },
            OnFalse: { $type: 'reference', targetId: result2Comp.id },
          } as any,
        });
      }
      if (condResult0Comp?.id && equals0Comp?.id && result0Comp?.id && condResult1Comp?.id) {
        await client.updateComponent({
          id: condResult0Comp.id,
          members: {
            Condition: { $type: 'reference', targetId: equals0Comp.id },
            OnTrue: { $type: 'reference', targetId: result0Comp.id },
            OnFalse: { $type: 'reference', targetId: condResult1Comp.id },
          } as any,
        });
      }

      // === GlobalReference設定 ===
      // PlayerWrite
      if (playerHandField?.id && playerGlobalRef?.id) {
        const fieldDetails = await client.getComponent(playerHandField.id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (valueId) {
          await client.updateComponent({
            id: playerGlobalRef.id,
            members: { Reference: { $type: 'reference', targetId: valueId } } as any,
          });
        }
      }
      if (playerSource?.id && playerGlobalRef?.id) {
        await client.updateComponent({
          id: playerSource.id,
          members: { Source: { $type: 'reference', targetId: playerGlobalRef.id } } as any,
        });
      }

      // CpuWrite
      if (cpuHandField?.id && cpuGlobalRef?.id) {
        const fieldDetails = await client.getComponent(cpuHandField.id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (valueId) {
          await client.updateComponent({
            id: cpuGlobalRef.id,
            members: { Reference: { $type: 'reference', targetId: valueId } } as any,
          });
        }
      }
      if (cpuSource?.id && cpuGlobalRef?.id) {
        await client.updateComponent({
          id: cpuSource.id,
          members: { Source: { $type: 'reference', targetId: cpuGlobalRef.id } } as any,
        });
      }

      // ResultWrite
      if (resultTextField?.id && resultGlobalRef?.id) {
        const fieldDetails = await client.getComponent(resultTextField.id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (valueId) {
          await client.updateComponent({
            id: resultGlobalRef.id,
            members: { Reference: { $type: 'reference', targetId: valueId } } as any,
          });
        }
      }
      if (resultSource?.id && resultGlobalRef?.id) {
        await client.updateComponent({
          id: resultSource.id,
          members: { Source: { $type: 'reference', targetId: resultGlobalRef.id } } as any,
        });
      }

      // === Write設定 ===
      // PlayerWrite
      if (playerWrite?.id && playerSource?.id && playerHandInputComp?.id) {
        await client.updateComponent({
          id: playerWrite.id,
          members: {
            Variable: { $type: 'reference', targetId: playerSource.id },
            Value: { $type: 'reference', targetId: playerHandInputComp.id },
          } as any,
        });
      }

      // CpuWrite
      if (cpuWrite?.id && cpuSource?.id && cond0Comp?.id) {
        await client.updateComponent({
          id: cpuWrite.id,
          members: {
            Variable: { $type: 'reference', targetId: cpuSource.id },
            Value: { $type: 'reference', targetId: cond0Comp.id },
          } as any,
        });
      }

      // ResultWrite
      if (resultWrite?.id && resultSource?.id && condResult0Comp?.id) {
        await client.updateComponent({
          id: resultWrite.id,
          members: {
            Variable: { $type: 'reference', targetId: resultSource.id },
            Value: { $type: 'reference', targetId: condResult0Comp.id },
          } as any,
        });
      }

      // === フロー接続 ===
      // Receiver.OnTriggered → PlayerWrite
      if (receiverComp?.id && playerWrite?.id) {
        const receiverDetails = await client.getComponent(receiverComp.id);
        const onTriggeredId = receiverDetails.data?.members?.OnTriggered?.id;
        if (onTriggeredId) {
          await client.updateComponent({
            id: receiverComp.id,
            members: { OnTriggered: { $type: 'reference', id: onTriggeredId, targetId: playerWrite.id } } as any,
          });
        }
      }

      // PlayerWrite.OnWritten → RandomWrite (ランダム値を保存)
      if (playerWrite?.id && randomWriteComp?.id) {
        const playerWriteDetails = await client.getComponent(playerWrite.id);
        const onWrittenId = playerWriteDetails.data?.members?.OnWritten?.id;
        if (onWrittenId) {
          await client.updateComponent({
            id: playerWrite.id,
            members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: randomWriteComp.id } } as any,
          });
        }
      }

      // RandomWrite.OnWritten → CpuWrite
      if (randomWriteComp?.id && cpuWrite?.id) {
        const randomWriteDetails = await client.getComponent(randomWriteComp.id);
        const onWrittenId = randomWriteDetails.data?.members?.OnWritten?.id;
        if (onWrittenId) {
          await client.updateComponent({
            id: randomWriteComp.id,
            members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: cpuWrite.id } } as any,
          });
        }
      }

      // CpuWrite.OnWritten → ResultWrite
      if (cpuWrite?.id && resultWrite?.id) {
        const cpuWriteDetails = await client.getComponent(cpuWrite.id);
        const onWrittenId = cpuWriteDetails.data?.members?.OnWritten?.id;
        if (onWrittenId) {
          await client.updateComponent({
            id: cpuWrite.id,
            members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: resultWrite.id } } as any,
          });
        }
      }

      console.log(`  ${handName}Logic: Full logic created (Player → Random → CPU → Result)`);
    }

    console.log('\n✅ Janken Game created successfully!');
    console.log(`   Main slot: ${slotName}`);
    console.log('   - Press グー, チョキ, or パー button');
    console.log('   - CPU will randomly choose and result will be shown');

  } finally {
    client.disconnect();
  }
}

main();

