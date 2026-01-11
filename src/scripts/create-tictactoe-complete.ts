/**
 * Complete Tic-Tac-Toe Game Creation Script
 * UI + ProtoFlux logic batch creation
 *
 * Usage: npx tsx src/scripts/create-tictactoe-complete.ts [ws://localhost:3343]
 */
import { ResoniteLinkClient } from '../client.js';

const WS_URL = process.argv[2] || 'ws://localhost:3343';

// Helper: Find component (check type or componentType)
function findComponent(data: any, typeIncludes: string, exclude?: string) {
  return data?.components?.find((c: any) => {
    const typeStr = c.type || c.componentType || '';
    const match = typeStr.includes(typeIncludes);
    if (exclude) return match && !typeStr.includes(exclude);
    return match;
  });
}

// Helper: Find multiple components
function findComponents(data: any, typeIncludes: string, exclude?: string) {
  return data?.components?.filter((c: any) => {
    const typeStr = c.type || c.componentType || '';
    const match = typeStr.includes(typeIncludes);
    if (exclude) return match && !typeStr.includes(exclude);
    return match;
  }) || [];
}

// Helper: Get slot ID
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
    console.log('Creating Complete Tic-Tac-Toe Game...\n');

    // ========== 1. Create main slot ==========
    const slotName = `TicTacToe_Play_${Date.now()}`;
    await client.addSlot({
      name: slotName,
      position: { x: 0, y: 1.5, z: 1.5 },
      isActive: true,
    });

    const mainSlot = await client.findSlotByName(slotName, 'Root', 1);
    if (!mainSlot?.id) throw new Error('Main slot not found');
    const mainId = mainSlot.id;
    console.log(`Main slot: ${mainId}`);

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
        members: { Size: { $type: 'float2', value: { x: 400, y: 480 } } } as any,
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

    // ========== 3. GameState slot (game state management) ==========
    await client.addSlot({ parentId: mainId, name: 'GameState' });
    const gameStateId = await getChildSlotId(client, mainId, 'GameState');

    // isOTurn (whether it's O's turn)
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<bool>' });
    // isGameOver (game over flag)
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<bool>' });

    // 9 cell states (ValueField<string>)
    for (let i = 0; i < 9; i++) {
      await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' });
    }
    // resultText (for result display)
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' });

    let gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
    const boolFields = findComponents(gameStateData.data, 'ValueField<bool>');
    const stringFields = findComponents(gameStateData.data, 'ValueField<string>');
    const isOTurnField = boolFields[0];  // first bool
    const isGameOverField = boolFields[1];  // second bool
    const cellFields = stringFields.slice(0, 9);  // first 9 strings
    const resultTextField = stringFields[9];  // 10th string

    if (isOTurnField?.id) {
      await client.updateComponent({
        id: isOTurnField.id,
        members: { Value: { $type: 'bool', value: true } } as any,
      });
    }
    if (isGameOverField?.id) {
      await client.updateComponent({
        id: isGameOverField.id,
        members: { Value: { $type: 'bool', value: false } } as any,
      });
    }
    console.log(`  GameState: isOTurn=${isOTurnField?.id}, isGameOver=${isGameOverField?.id}, cells=${cellFields.length}, resultText=${resultTextField?.id}`);

    // ========== 4. Background ==========
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
          Tint: { $type: 'colorX', value: { r: 0.1, g: 0.12, b: 0.18, a: 0.98 } },
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
          Spacing: { $type: 'float', value: 10 },
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
          Content: { $type: 'string', value: 'Tic-Tac-Toe' },
          Size: { $type: 'float', value: 36 },
          Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
        } as any,
      });
    }
    console.log('  Header created');

    // ========== 7. TurnDisplay ==========
    await client.addSlot({ parentId: contentId, name: 'TurnDisplay' });
    const turnDisplayId = await getChildSlotId(client, contentId, 'TurnDisplay');

    await client.addComponent({ containerSlotId: turnDisplayId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: turnDisplayId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: turnDisplayId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

    let turnData = await client.getSlot({ slotId: turnDisplayId, includeComponentData: true });
    const turnLayout = findComponent(turnData.data, 'LayoutElement');
    const turnText = findComponent(turnData.data, 'Text', 'TextField');

    if (turnLayout?.id) {
      await client.updateComponent({
        id: turnLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 35 } } as any,
      });
    }
    if (turnText?.id) {
      await client.updateComponent({
        id: turnText.id,
        members: {
          Content: { $type: 'string', value: "O's Turn" },
          Size: { $type: 'float', value: 24 },
          Color: { $type: 'colorX', value: { r: 0.5, g: 0.8, b: 1, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
        } as any,
      });
    }
    console.log('  TurnDisplay created');

    // ========== 7.5. ResultDisplay (win/lose result display) ==========
    await client.addSlot({ parentId: contentId, name: 'ResultDisplay' });
    const resultDisplayId = await getChildSlotId(client, contentId, 'ResultDisplay');

    await client.addComponent({ containerSlotId: resultDisplayId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: resultDisplayId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: resultDisplayId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

    let resultDisplayData = await client.getSlot({ slotId: resultDisplayId, includeComponentData: true });
    const resultLayout = findComponent(resultDisplayData.data, 'LayoutElement');
    const resultText = findComponent(resultDisplayData.data, 'Text', 'TextField');

    if (resultLayout?.id) {
      await client.updateComponent({
        id: resultLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 35 } } as any,
      });
    }
    if (resultText?.id) {
      await client.updateComponent({
        id: resultText.id,
        members: {
          Content: { $type: 'string', value: '' },
          Size: { $type: 'float', value: 28 },
          Color: { $type: 'colorX', value: { r: 1, g: 0.9, b: 0.3, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
        } as any,
      });
    }

    // ResultDisplay is always shown (invisible when empty string, visible when result is set)
    console.log('  ResultDisplay created');

    // ========== 8. Board (3x3 Grid) ==========
    await client.addSlot({ parentId: contentId, name: 'Board' });
    const boardId = await getChildSlotId(client, contentId, 'Board');

    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.UIX.VerticalLayout' });

    let boardData = await client.getSlot({ slotId: boardId, includeComponentData: true });
    const boardLayout = findComponent(boardData.data, 'LayoutElement');
    const boardVLayout = findComponent(boardData.data, 'VerticalLayout');

    if (boardLayout?.id) {
      await client.updateComponent({
        id: boardLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 300 } } as any,
      });
    }
    if (boardVLayout?.id) {
      await client.updateComponent({
        id: boardVLayout.id,
        members: {
          Spacing: { $type: 'float', value: 8 },
          ForceExpandWidth: { $type: 'bool', value: true },
          ForceExpandHeight: { $type: 'bool', value: true },
        } as any,
      });
    }

    // Save cell info
    const cellTextIds: string[] = [];
    const cellTriggerIds: string[] = [];  // ButtonDynamicImpulseTrigger IDs

    // Create 3 rows x 3 columns
    for (let row = 0; row < 3; row++) {
      await client.addSlot({ parentId: boardId, name: `Row${row}` });
      const rowId = await getChildSlotId(client, boardId, `Row${row}`);

      await client.addComponent({ containerSlotId: rowId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
      await client.addComponent({ containerSlotId: rowId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
      await client.addComponent({ containerSlotId: rowId, componentType: '[FrooxEngine]FrooxEngine.UIX.HorizontalLayout' });

      let rowData = await client.getSlot({ slotId: rowId, includeComponentData: true });
      const rowLayout = findComponent(rowData.data, 'LayoutElement');
      const rowHLayout = findComponent(rowData.data, 'HorizontalLayout');

      if (rowLayout?.id) {
        await client.updateComponent({
          id: rowLayout.id,
          members: { FlexibleHeight: { $type: 'float', value: 1 } } as any,
        });
      }
      if (rowHLayout?.id) {
        await client.updateComponent({
          id: rowHLayout.id,
          members: {
            Spacing: { $type: 'float', value: 8 },
            ForceExpandWidth: { $type: 'bool', value: true },
            ForceExpandHeight: { $type: 'bool', value: true },
          } as any,
        });
      }

      for (let col = 0; col < 3; col++) {
        const cellIdx = row * 3 + col;
        const cellName = `Cell_${row}_${col}`;

        await client.addSlot({ parentId: rowId, name: cellName });
        const cellId = await getChildSlotId(client, rowId, cellName);

        await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
        await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
        await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });
        await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.UIX.Button' });
        await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.ButtonDynamicImpulseTrigger' });

        let cellData = await client.getSlot({ slotId: cellId, includeComponentData: true });
        const cellLayout = findComponent(cellData.data, 'LayoutElement');
        const cellImage = findComponent(cellData.data, 'Image');
        const cellTrigger = findComponent(cellData.data, 'ButtonDynamicImpulseTrigger');

        if (cellLayout?.id) {
          await client.updateComponent({
            id: cellLayout.id,
            members: { FlexibleWidth: { $type: 'float', value: 1 }, FlexibleHeight: { $type: 'float', value: 1 } } as any,
          });
        }
        if (cellImage?.id) {
          await client.updateComponent({
            id: cellImage.id,
            members: { Tint: { $type: 'colorX', value: { r: 0.2, g: 0.22, b: 0.28, a: 1 } } } as any,
          });
        }
        if (cellTrigger?.id) {
          await client.updateComponent({
            id: cellTrigger.id,
            members: {
              PressedTag: { $type: 'string', value: `Cell_${cellIdx}` },
              Target: { $type: 'reference', targetId: mainId },  // Only respond to Receivers in the same game
            } as any,
          });
          cellTriggerIds.push(cellTrigger.id);
        }

        // Cell text
        await client.addSlot({ parentId: cellId, name: 'Text' });
        const textSlotId = await getChildSlotId(client, cellId, 'Text');

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
              Content: { $type: 'string', value: '' },
              Size: { $type: 'float', value: 56 },
              Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
              HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
              VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
            } as any,
          });
          cellTextIds.push(textComp.id);
        }
      }
    }
    console.log('  Board created (3x3)');

    // ========== 9. ResetButton ==========
    await client.addSlot({ parentId: contentId, name: 'ResetButton' });
    const resetBtnId = await getChildSlotId(client, contentId, 'ResetButton');

    await client.addComponent({ containerSlotId: resetBtnId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: resetBtnId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: resetBtnId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });
    await client.addComponent({ containerSlotId: resetBtnId, componentType: '[FrooxEngine]FrooxEngine.UIX.Button' });
    await client.addComponent({ containerSlotId: resetBtnId, componentType: '[FrooxEngine]FrooxEngine.ButtonDynamicImpulseTrigger' });

    let resetData = await client.getSlot({ slotId: resetBtnId, includeComponentData: true });
    const resetLayout = findComponent(resetData.data, 'LayoutElement');
    const resetImage = findComponent(resetData.data, 'Image');
    const resetTrigger = findComponent(resetData.data, 'ButtonDynamicImpulseTrigger');

    if (resetLayout?.id) {
      await client.updateComponent({
        id: resetLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 45 } } as any,
      });
    }
    if (resetImage?.id) {
      await client.updateComponent({
        id: resetImage.id,
        members: { Tint: { $type: 'colorX', value: { r: 0.6, g: 0.25, b: 0.25, a: 1 } } } as any,
      });
    }
    if (resetTrigger?.id) {
      await client.updateComponent({
        id: resetTrigger.id,
        members: {
          PressedTag: { $type: 'string', value: 'Reset' },
          Target: { $type: 'reference', targetId: mainId },  // Only receivers in the same game respond
        } as any,
      });
    }

    // ResetButton Text
    await client.addSlot({ parentId: resetBtnId, name: 'Text' });
    const resetTextSlotId = await getChildSlotId(client, resetBtnId, 'Text');

    await client.addComponent({ containerSlotId: resetTextSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: resetTextSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

    let resetTextData = await client.getSlot({ slotId: resetTextSlotId, includeComponentData: true });
    const resetTextRect = findComponent(resetTextData.data, 'RectTransform');
    const resetTextComp = findComponent(resetTextData.data, 'Text', 'TextField');

    if (resetTextRect?.id) {
      await client.updateComponent({
        id: resetTextRect.id,
        members: {
          AnchorMin: { $type: 'float2', value: { x: 0, y: 0 } },
          AnchorMax: { $type: 'float2', value: { x: 1, y: 1 } },
        } as any,
      });
    }
    if (resetTextComp?.id) {
      await client.updateComponent({
        id: resetTextComp.id,
        members: {
          Content: { $type: 'string', value: 'Reset' },
          Size: { $type: 'float', value: 22 },
          Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
          VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
        } as any,
      });
    }
    console.log('  ResetButton created');

    // ========== 10. Drive cell text with ValueFieldDrive ==========
    for (let i = 0; i < 9 && i < cellFields.length && i < cellTextIds.length; i++) {
      const cellField = cellFields[i];
      const textCompId = cellTextIds[i];

      await client.addComponent({
        containerSlotId: gameStateId,
        componentType: '[FrooxEngine]FrooxEngine.ValueDriver<string>',
      });

      // Get added drive
      gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
      const drives = findComponents(gameStateData.data, 'ValueDriver');
      const drive = drives[drives.length - 1];

      if (drive?.id) {
        // Get Text component's Content field ID
        const textDetails = await client.getComponent(textCompId);
        const contentFieldId = textDetails.data?.members?.Content?.id;

        // Get ValueField<string>'s Value field ID
        const cellFieldDetails = await client.getComponent(cellField.id);
        const cellValueId = cellFieldDetails.data?.members?.Value?.id;

        // Drive settings
        const driveDetails = await client.getComponent(drive.id);
        const driveTargetId = driveDetails.data?.members?.DriveTarget?.id;

        await client.updateComponent({
          id: drive.id,
          members: {
            ValueSource: { $type: 'reference', targetId: cellValueId },
            DriveTarget: { $type: 'reference', id: driveTargetId, targetId: contentFieldId },
          } as any,
        });
      }
    }
    console.log('  Cell text drives connected');

    // ========== 11. Drive TurnDisplay (BooleanValueDriver) ==========
    await client.addComponent({
      containerSlotId: gameStateId,
      componentType: '[FrooxEngine]FrooxEngine.BooleanValueDriver<string>',
    });

    gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
    const turnDriver = findComponent(gameStateData.data, 'BooleanValueDriver');

    if (turnDriver?.id && turnText?.id && isOTurnField?.id) {
      // Get TurnText's Content field ID
      const turnTextDetails = await client.getComponent(turnText.id);
      const turnContentId = turnTextDetails.data?.members?.Content?.id;

      // Get BooleanValueDriver details
      const turnDriverDetails = await client.getComponent(turnDriver.id);
      const targetFieldId = turnDriverDetails.data?.members?.TargetField?.id;

      // Set TrueValue/FalseValue
      await client.updateComponent({
        id: turnDriver.id,
        members: {
          TrueValue: { $type: 'string', value: "O's Turn" },
          FalseValue: { $type: 'string', value: "X's Turn" },
        } as any,
      });

      // Set TargetField (FieldDrive - drive target)
      await client.updateComponent({
        id: turnDriver.id,
        members: {
          TargetField: { $type: 'reference', id: targetFieldId, targetId: turnContentId },
        } as any,
      });

      // Add ValueDriver<bool> to drive State from isOTurn
      await client.addComponent({
        containerSlotId: gameStateId,
        componentType: '[FrooxEngine]FrooxEngine.ValueDriver<bool>',
      });

      gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
      const stateDrives = findComponents(gameStateData.data, 'ValueDriver<bool>');
      const stateDrive = stateDrives[stateDrives.length - 1];

      if (stateDrive?.id) {
        // Get isOTurnField's Value field ID
        const isOTurnDetails = await client.getComponent(isOTurnField.id);
        const isOTurnValueId = isOTurnDetails.data?.members?.Value?.id;

        // Get BooleanValueDriver's State field ID
        const turnDriverRefresh = await client.getComponent(turnDriver.id);
        const stateFieldId = turnDriverRefresh.data?.members?.State?.id;

        const stateDriveDetails = await client.getComponent(stateDrive.id);
        const driveTargetId = stateDriveDetails.data?.members?.DriveTarget?.id;

        // ValueDriver: isOTurnField.Value → BooleanValueDriver.State
        await client.updateComponent({
          id: stateDrive.id,
          members: {
            ValueSource: { $type: 'reference', targetId: isOTurnValueId },
            DriveTarget: { $type: 'reference', id: driveTargetId, targetId: stateFieldId },
          } as any,
        });
      }
    }
    console.log('  TurnDisplay driver connected');

    // ========== 11.5. Display switching (temporarily disabled) ==========
    // Note: To drive Slot's ActiveSelf, component ID is needed, but
    // slots are not components so cannot be directly obtained via ResoniteLink.
    // For now, both TurnDisplay and ResultDisplay are shown.
    // ResultDisplay only shows result text when game ends (empty otherwise).
    console.log('  Display visibility drivers skipped (not implemented yet)');

    // Drive ResultDisplay.Text.Content with resultTextField.Value
    if (resultText?.id && resultTextField?.id) {
      await client.addComponent({
        containerSlotId: gameStateId,
        componentType: '[FrooxEngine]FrooxEngine.ValueDriver<string>',
      });
      gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
      const resultTextDrives = findComponents(gameStateData.data, 'ValueDriver<string>');
      const resultTextDrive = resultTextDrives[resultTextDrives.length - 1];

      if (resultTextDrive?.id) {
        const resultTextFieldDetails = await client.getComponent(resultTextField.id);
        const resultTextValueId = resultTextFieldDetails.data?.members?.Value?.id;
        const resultTextCompDetails = await client.getComponent(resultText.id);
        const resultContentId = resultTextCompDetails.data?.members?.Content?.id;
        const resultTextDriveDetails = await client.getComponent(resultTextDrive.id);
        const driveTargetId = resultTextDriveDetails.data?.members?.DriveTarget?.id;

        await client.updateComponent({
          id: resultTextDrive.id,
          members: {
            ValueSource: { $type: 'reference', targetId: resultTextValueId },
            DriveTarget: { $type: 'reference', id: driveTargetId, targetId: resultContentId },
          } as any,
        });
      }
    }
    console.log('  ResultDisplay text driver connected');

    // ========== 12. ProtoFlux (game logic) ==========
    // Important: Only one ProtoFlux component per slot
    await client.addSlot({ parentId: mainId, name: 'Flux' });
    const fluxId = await getChildSlotId(client, mainId, 'Flux');

    // ProtoFlux for each cell
    for (let i = 0; i < 9; i++) {
      const cellField = cellFields[i];
      if (!cellField?.id) continue;

      const row = Math.floor(i / 3);
      const col = i % 3;
      const baseX = (col - 1) * 1.5;
      const baseY = (1 - row) * 1.2;

      // Parent slot for cell
      await client.addSlot({
        parentId: fluxId,
        name: `Cell_${i}`,
        position: { x: baseX, y: baseY, z: 0 },
      });
      const cellLogicId = await getChildSlotId(client, fluxId, `Cell_${i}`);

      // Create slots for each node
      // CellSource = ObjectValueSource<string>, TurnSource = ValueSource<bool>
      // Note: EmptyStr not needed. ValueField<string>'s initial value is null, so not connecting Equals.B makes it a null comparison
      // GameOverSource, NotGameOver, ConditionAnd: For game over check
      // CheckWinTrigger: Call win check after cell update
      const nodeNames = ['Receiver', 'TagInput', 'If', 'Equals', 'Conditional', 'OInput', 'XInput', 'CellSource', 'TurnSource', 'Write', 'TurnWrite', 'Not', 'GameOverSource', 'NotGameOver', 'ConditionAnd', 'CheckWinTrigger', 'CheckWinTag'];
      for (const name of nodeNames) {
        await client.addSlot({ parentId: cellLogicId, name });
      }

      // Get slot IDs
      const cellLogicData = await client.getSlot({ slotId: cellLogicId, depth: 1 });
      const getNodeSlotId = (name: string) => cellLogicData.data?.children?.find((c: any) => c.name?.value === name)?.id;

      const receiverSlotId = getNodeSlotId('Receiver');
      const tagInputSlotId = getNodeSlotId('TagInput');
      const ifSlotId = getNodeSlotId('If');
      const equalsSlotId = getNodeSlotId('Equals');
      const conditionalSlotId = getNodeSlotId('Conditional');
      const oInputSlotId = getNodeSlotId('OInput');
      const xInputSlotId = getNodeSlotId('XInput');
      const cellSourceSlotId = getNodeSlotId('CellSource');
      const turnSourceSlotId = getNodeSlotId('TurnSource');
      const writeSlotId = getNodeSlotId('Write');
      const turnWriteSlotId = getNodeSlotId('TurnWrite');
      const notSlotId = getNodeSlotId('Not');
      const gameOverSourceSlotId = getNodeSlotId('GameOverSource');
      const notGameOverSlotId = getNodeSlotId('NotGameOver');
      const conditionAndSlotId = getNodeSlotId('ConditionAnd');
      const checkWinTriggerSlotId = getNodeSlotId('CheckWinTrigger');
      const checkWinTagSlotId = getNodeSlotId('CheckWinTag');

      // Add components to each slot
      await client.addComponent({ containerSlotId: receiverSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver' });
      // GlobalValue<string> implements IGlobalValueProxy<string> (needed for DynamicImpulseReceiver.Tag)
      await client.addComponent({ containerSlotId: tagInputSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>' });
      await client.addComponent({ containerSlotId: ifSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.If' });
      await client.addComponent({ containerSlotId: equalsSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectEquals<string>' });
      await client.addComponent({ containerSlotId: conditionalSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectConditional<string>' });
      await client.addComponent({ containerSlotId: oInputSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
      await client.addComponent({ containerSlotId: xInputSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
      // ObjectValueSource<string> - Source for reading/writing cell state (implements IVariable<FrooxEngineContext, T>)
      await client.addComponent({ containerSlotId: cellSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      // ValueSource<bool> - Source for reading/writing turn state (implements IVariable<FrooxEngineContext, T>)
      await client.addComponent({ containerSlotId: turnSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
      // FrooxEngineContext version Write nodes (for compatibility with ObjectValueSource/ValueSource)
      await client.addComponent({ containerSlotId: writeSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });
      await client.addComponent({ containerSlotId: turnWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>' });
      await client.addComponent({ containerSlotId: notSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.NOT_Bool' });
      // For game over check
      await client.addComponent({ containerSlotId: gameOverSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
      await client.addComponent({ containerSlotId: notGameOverSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.NOT_Bool' });
      await client.addComponent({ containerSlotId: conditionAndSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
      // Win check Trigger
      await client.addComponent({ containerSlotId: checkWinTriggerSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseTrigger' });
      // DynamicImpulseTrigger.Tag expects INodeObjectOutput<string>, so use ValueObjectInput
      await client.addComponent({ containerSlotId: checkWinTagSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });

      // Get each component
      const getComp = async (slotId: string, typeIncludes: string) => {
        const data = await client.getSlot({ slotId, includeComponentData: true });
        return findComponent(data.data, typeIncludes);
      };

      const receiverComp = await getComp(receiverSlotId, 'DynamicImpulseReceiver');
      const tagInputComp = await getComp(tagInputSlotId, 'GlobalValue');
      const ifComp = await getComp(ifSlotId, 'If');
      const equalsComp = await getComp(equalsSlotId, 'ObjectEquals');
      const conditionalComp = await getComp(conditionalSlotId, 'ObjectConditional');
      const oInputComp = await getComp(oInputSlotId, 'ValueObjectInput');
      const xInputComp = await getComp(xInputSlotId, 'ValueObjectInput');
      const cellSourceComp = await getComp(cellSourceSlotId, 'ObjectValueSource');
      const turnSourceComp = await getComp(turnSourceSlotId, 'ValueSource');
      const writeComp = await getComp(writeSlotId, 'ObjectWrite');
      const turnWriteComp = await getComp(turnWriteSlotId, 'ValueWrite');
      const notComp = await getComp(notSlotId, 'NOT_Bool');
      const gameOverSourceComp = await getComp(gameOverSourceSlotId, 'ValueSource');
      const notGameOverComp = await getComp(notGameOverSlotId, 'NOT_Bool');
      const conditionAndComp = await getComp(conditionAndSlotId, 'AND_Bool');
      const checkWinTriggerComp = await getComp(checkWinTriggerSlotId, 'DynamicImpulseTrigger');
      const checkWinTagComp = await getComp(checkWinTagSlotId, 'ValueObjectInput');

      // TagInput setup & Receiver.Tag <- TagInput
      if (tagInputComp?.id) {
        await client.updateComponent({ id: tagInputComp.id, members: { Value: { $type: 'string', value: `Cell_${i}` } } as any });
      }
      if (receiverComp?.id && tagInputComp?.id) {
        await client.updateComponent({
          id: receiverComp.id,
          members: { Tag: { $type: 'reference', targetId: tagInputComp.id } } as any,
        });
      }

      // Value input setup
      if (oInputComp?.id) {
        await client.updateComponent({ id: oInputComp.id, members: { Value: { $type: 'string', value: '○' } } as any });
      }
      if (xInputComp?.id) {
        await client.updateComponent({ id: xInputComp.id, members: { Value: { $type: 'string', value: '×' } } as any });
      }

      // ObjectValueSource/ValueSource Source setup
      // Manually add GlobalReference and set Source and Reference
      // Important: Set ValueField.Value (implements IValue<T>) to GlobalReference.Reference
      if (cellSourceComp?.id) {
        // Add GlobalReference<IValue<string>>
        await client.addComponent({
          containerSlotId: cellSourceSlotId,
          componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>',
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        const cellSourceSlotData = await client.getSlot({ slotId: cellSourceSlotId, includeComponentData: true });
        const globalRefComp = findComponent(cellSourceSlotData.data, 'GlobalReference');

        // Get ValueField<string>.Value ID
        const cellFieldDetails = await client.getComponent(cellField.id);
        const cellValueId = cellFieldDetails.data?.members?.Value?.id;

        if (globalRefComp?.id && cellValueId) {
          // GlobalReference.Reference → ValueField<string>.Value (IValue<string>)
          await client.updateComponent({
            id: globalRefComp.id,
            members: { Reference: { $type: 'reference', targetId: cellValueId } } as any,
          });
          // ObjectValueSource.Source → GlobalReference
          await client.updateComponent({
            id: cellSourceComp.id,
            members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any,
          });
        }
      }
      if (turnSourceComp?.id && isOTurnField?.id) {
        // Add GlobalReference<IValue<bool>>
        await client.addComponent({
          containerSlotId: turnSourceSlotId,
          componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>',
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        const turnSourceSlotData = await client.getSlot({ slotId: turnSourceSlotId, includeComponentData: true });
        const globalRefComp = findComponent(turnSourceSlotData.data, 'GlobalReference');

        // Get ValueField<bool>.Value ID
        const turnFieldDetails = await client.getComponent(isOTurnField.id);
        const turnValueId = turnFieldDetails.data?.members?.Value?.id;

        if (globalRefComp?.id && turnValueId) {
          // GlobalReference.Reference → ValueField<bool>.Value (IValue<bool>)
          await client.updateComponent({
            id: globalRefComp.id,
            members: { Reference: { $type: 'reference', targetId: turnValueId } } as any,
          });
          // ValueSource.Source → GlobalReference
          await client.updateComponent({
            id: turnSourceComp.id,
            members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any,
          });
        }
      }

      // GameOverSource setup (referencing isGameOverField)
      if (gameOverSourceComp?.id && isGameOverField?.id) {
        await client.addComponent({
          containerSlotId: gameOverSourceSlotId,
          componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>',
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        const gameOverSourceSlotData = await client.getSlot({ slotId: gameOverSourceSlotId, includeComponentData: true });
        const globalRefComp = findComponent(gameOverSourceSlotData.data, 'GlobalReference');

        const gameOverFieldDetails = await client.getComponent(isGameOverField.id);
        const gameOverValueId = gameOverFieldDetails.data?.members?.Value?.id;

        if (globalRefComp?.id && gameOverValueId) {
          await client.updateComponent({
            id: globalRefComp.id,
            members: { Reference: { $type: 'reference', targetId: gameOverValueId } } as any,
          });
          await client.updateComponent({
            id: gameOverSourceComp.id,
            members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any,
          });
        }
      }

      // NotGameOver.A <- GameOverSource (game not over = NOT(isGameOver))
      if (notGameOverComp?.id && gameOverSourceComp?.id) {
        await client.updateComponent({
          id: notGameOverComp.id,
          members: { A: { $type: 'reference', targetId: gameOverSourceComp.id } } as any,
        });
      }

      // Node connections
      // Receiver.OnTriggered → If
      if (receiverComp?.id && ifComp?.id) {
        const receiverDetails = await client.getComponent(receiverComp.id);
        const onTriggeredId = receiverDetails.data?.members?.OnTriggered?.id;
        await client.updateComponent({
          id: receiverComp.id,
          members: { OnTriggered: { $type: 'reference', id: onTriggeredId, targetId: ifComp.id } } as any,
        });
      }

      // If.Condition <- ConditionAnd (cell empty AND game not over)
      if (ifComp?.id && conditionAndComp?.id) {
        await client.updateComponent({
          id: ifComp.id,
          members: { Condition: { $type: 'reference', targetId: conditionAndComp.id } } as any,
        });
      }

      // ConditionAnd.A <- Equals (cell is empty), ConditionAnd.B <- NotGameOver (game not over)
      if (conditionAndComp?.id && equalsComp?.id && notGameOverComp?.id) {
        await client.updateComponent({
          id: conditionAndComp.id,
          members: {
            A: { $type: 'reference', targetId: equalsComp.id },
            B: { $type: 'reference', targetId: notGameOverComp.id },
          } as any,
        });
      }

      // Equals.A <- CellSource (cell value), Equals.B is not connected (null comparison)
      if (equalsComp?.id && cellSourceComp?.id) {
        await client.updateComponent({
          id: equalsComp.id,
          members: {
            A: { $type: 'reference', targetId: cellSourceComp.id },
          } as any,
        });
      }

      // If.OnTrue → Write
      if (ifComp?.id && writeComp?.id) {
        const ifDetails = await client.getComponent(ifComp.id);
        const onTrueId = ifDetails.data?.members?.OnTrue?.id;
        await client.updateComponent({
          id: ifComp.id,
          members: { OnTrue: { $type: 'reference', id: onTrueId, targetId: writeComp.id } } as any,
        });
      }

      // Write.Variable <- CellSource (implements IVariable), Write.Value <- Conditional
      if (writeComp?.id && cellSourceComp?.id && conditionalComp?.id) {
        await client.updateComponent({
          id: writeComp.id,
          members: {
            Variable: { $type: 'reference', targetId: cellSourceComp.id },
            Value: { $type: 'reference', targetId: conditionalComp.id },
          } as any,
        });
      }

      // Conditional.Condition <- TurnSource (bool output), Conditional.OnTrue <- OInput, Conditional.OnFalse <- XInput
      if (conditionalComp?.id && turnSourceComp?.id && oInputComp?.id && xInputComp?.id) {
        await client.updateComponent({
          id: conditionalComp.id,
          members: {
            Condition: { $type: 'reference', targetId: turnSourceComp.id },
            OnTrue: { $type: 'reference', targetId: oInputComp.id },
            OnFalse: { $type: 'reference', targetId: xInputComp.id },
          } as any,
        });
      }

      // Write.OnWritten → TurnWrite
      if (writeComp?.id && turnWriteComp?.id) {
        const writeDetails = await client.getComponent(writeComp.id);
        const onWrittenId = writeDetails.data?.members?.OnWritten?.id;
        await client.updateComponent({
          id: writeComp.id,
          members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: turnWriteComp.id } } as any,
        });
      }

      // TurnWrite.Variable <- TurnSource (implements IVariable), TurnWrite.Value <- Not
      if (turnWriteComp?.id && turnSourceComp?.id && notComp?.id) {
        await client.updateComponent({
          id: turnWriteComp.id,
          members: {
            Variable: { $type: 'reference', targetId: turnSourceComp.id },
            Value: { $type: 'reference', targetId: notComp.id },
          } as any,
        });
      }

      // Not.A <- TurnSource (bool output)
      if (notComp?.id && turnSourceComp?.id) {
        await client.updateComponent({
          id: notComp.id,
          members: { A: { $type: 'reference', targetId: turnSourceComp.id } } as any,
        });
      }

      // CheckWinTag setup ("CheckWin" tag)
      if (checkWinTagComp?.id) {
        await client.updateComponent({
          id: checkWinTagComp.id,
          members: { Value: { $type: 'string', value: 'CheckWin' } } as any,
        });
      }

      // Add RefObjectInput<Slot> for TargetHierarchy
      await client.addSlot({ parentId: cellLogicId, name: 'TargetSlot' });
      const targetSlotSlotId = await getChildSlotId(client, cellLogicId, 'TargetSlot');
      await client.addComponent({
        containerSlotId: targetSlotSlotId,
        componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.Slot>',
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      const targetSlotData = await client.getSlot({ slotId: targetSlotSlotId, includeComponentData: true });
      const targetSlotComp = findComponent(targetSlotData.data, 'RefObjectInput');

      // Set mainId to TargetSlot
      if (targetSlotComp?.id) {
        await client.updateComponent({
          id: targetSlotComp.id,
          members: { Target: { $type: 'reference', targetId: mainId } } as any,
        });
      }

      // CheckWinTrigger setup: Tag <- CheckWinTag, TargetHierarchy <- TargetSlot
      if (checkWinTriggerComp?.id && checkWinTagComp?.id && targetSlotComp?.id) {
        await client.updateComponent({
          id: checkWinTriggerComp.id,
          members: {
            Tag: { $type: 'reference', targetId: checkWinTagComp.id },
            TargetHierarchy: { $type: 'reference', targetId: targetSlotComp.id },
          } as any,
        });
      }

      // TurnWrite.OnWritten -> CheckWinTrigger (check win after turn update)
      if (turnWriteComp?.id && checkWinTriggerComp?.id) {
        const turnWriteDetails = await client.getComponent(turnWriteComp.id);
        const onWrittenId = turnWriteDetails.data?.members?.OnWritten?.id;
        await client.updateComponent({
          id: turnWriteComp.id,
          members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: checkWinTriggerComp.id } } as any,
        });
      }

      console.log(`  Cell_${i}: ProtoFlux nodes created and connected`);
    }

    // ========== Win determination logic ==========
    console.log('  Creating win check logic...');
    await client.addSlot({ parentId: fluxId, name: 'WinCheck', position: { x: 3, y: 0, z: 0 } });
    const winCheckId = await getChildSlotId(client, fluxId, 'WinCheck');

    // 8 lines definition: [cellA, cellB, cellC]
    const lines = [
      [0, 1, 2], // row 1
      [3, 4, 5], // row 2
      [6, 7, 8], // row 3
      [0, 3, 6], // column 1
      [1, 4, 7], // column 2
      [2, 5, 8], // column 3
      [0, 4, 8], // diagonal top-left to bottom-right
      [2, 4, 6], // diagonal top-right to bottom-left
    ];

    // Create win determination nodes
    const winCheckNodes = [
      'Receiver', 'TagInput',  // DynamicImpulse receive
      'IfWinner', 'IfDraw',    // winner/draw decision branches
      'GameOverWrite', 'GameOverSource', // for writing isGameOver
      'ResultWrite', 'ResultSource', // for writing resultText
      'TrueInput',             // true constant
      'OWinText', 'XWinText', 'DrawText', // result text
      'WinnerConditional',     // winner mark selection
      'DrawConditional',       // draw text selection
    ];
    // Cell sources and comparison nodes for 8 lines
    for (let l = 0; l < 8; l++) {
      winCheckNodes.push(`L${l}_CellA`, `L${l}_CellB`, `L${l}_CellC`);  // 3 cells read
      winCheckNodes.push(`L${l}_EqAB`, `L${l}_EqBC`, `L${l}_NotNull`);  // comparison nodes
      winCheckNodes.push(`L${l}_And1`, `L${l}_And2`);                   // AND
    }
    // 8 lines OR (chain structure)
    winCheckNodes.push('Or_01', 'Or_23', 'Or_45', 'Or_67', 'Or_0123', 'Or_4567', 'OrAll');
    // Draw determination (all 9 cells are not null)
    for (let c = 0; c < 9; c++) {
      winCheckNodes.push(`Draw_Cell${c}`, `Draw_NotNull${c}`);
    }
    // 9 cells AND chain: And_01, And_012, ..., And_01234567, Draw_AndAll
    winCheckNodes.push('Draw_And_01', 'Draw_And_012', 'Draw_And_0123', 'Draw_And_01234', 'Draw_And_012345', 'Draw_And_0123456', 'Draw_And_01234567', 'Draw_AndAll', 'Draw_NotWin', 'Draw_Final');
    // For winner mark
    winCheckNodes.push('WinnerMark');

    for (const name of winCheckNodes) {
      await client.addSlot({ parentId: winCheckId, name });
    }

    const winCheckData = await client.getSlot({ slotId: winCheckId, depth: 1 });
    const getWinSlotId = (name: string) => winCheckData.data?.children?.find((c: any) => c.name?.value === name)?.id;

    // Add basic node components
    const receiverWinSlotId = getWinSlotId('Receiver');
    const tagInputWinSlotId = getWinSlotId('TagInput');
    const ifWinnerSlotId = getWinSlotId('IfWinner');
    const ifDrawSlotId = getWinSlotId('IfDraw');
    const gameOverWriteSlotId = getWinSlotId('GameOverWrite');
    const gameOverSourceSlotId2 = getWinSlotId('GameOverSource');
    const resultWriteSlotId = getWinSlotId('ResultWrite');
    const resultSourceSlotId = getWinSlotId('ResultSource');
    const trueInputWinSlotId = getWinSlotId('TrueInput');
    const oWinTextSlotId = getWinSlotId('OWinText');
    const xWinTextSlotId = getWinSlotId('XWinText');
    const drawTextSlotId = getWinSlotId('DrawText');
    const winnerConditionalSlotId = getWinSlotId('WinnerConditional');
    const winnerMarkSlotId = getWinSlotId('WinnerMark');

    await client.addComponent({ containerSlotId: receiverWinSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver' });
    await client.addComponent({ containerSlotId: tagInputWinSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>' });
    await client.addComponent({ containerSlotId: ifWinnerSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.If' });
    await client.addComponent({ containerSlotId: ifDrawSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.If' });
    await client.addComponent({ containerSlotId: gameOverWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>' });
    await client.addComponent({ containerSlotId: gameOverSourceSlotId2, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
    await client.addComponent({ containerSlotId: resultWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });
    await client.addComponent({ containerSlotId: resultSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
    await client.addComponent({ containerSlotId: trueInputWinSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<bool>' });
    await client.addComponent({ containerSlotId: oWinTextSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
    await client.addComponent({ containerSlotId: xWinTextSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
    await client.addComponent({ containerSlotId: drawTextSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
    await client.addComponent({ containerSlotId: winnerConditionalSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectConditional<string>' });
    await client.addComponent({ containerSlotId: winnerMarkSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });

    // Add nodes for 8 lines
    for (let l = 0; l < 8; l++) {
      await client.addComponent({ containerSlotId: getWinSlotId(`L${l}_CellA`), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId(`L${l}_CellB`), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId(`L${l}_CellC`), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId(`L${l}_EqAB`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectEquals<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId(`L${l}_EqBC`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectEquals<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId(`L${l}_NotNull`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectNotEquals<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId(`L${l}_And1`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
      await client.addComponent({ containerSlotId: getWinSlotId(`L${l}_And2`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
    }

    // Add OR nodes (chain structure)
    await client.addComponent({ containerSlotId: getWinSlotId('Or_01'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.OR_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Or_23'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.OR_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Or_45'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.OR_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Or_67'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.OR_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Or_0123'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.OR_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Or_4567'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.OR_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('OrAll'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.OR_Bool' });

    // Add draw determination nodes
    for (let c = 0; c < 9; c++) {
      await client.addComponent({ containerSlotId: getWinSlotId(`Draw_Cell${c}`), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId(`Draw_NotNull${c}`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectNotEquals<string>' });
    }
    // AND chain (9 cell determination)
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_And_01'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_And_012'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_And_0123'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_And_01234'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_And_012345'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_And_0123456'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_And_01234567'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_AndAll'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_NotWin'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.NOT_Bool' });
    await client.addComponent({ containerSlotId: getWinSlotId('Draw_Final'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Component retrieval helper
    const getWinComp = async (name: string, typeIncludes: string) => {
      const slotId = getWinSlotId(name);
      if (!slotId) return null;
      const data = await client.getSlot({ slotId, includeComponentData: true });
      return findComponent(data.data, typeIncludes);
    };

    // Basic node settings
    const receiverWinComp = await getWinComp('Receiver', 'DynamicImpulseReceiver');
    const tagInputWinComp = await getWinComp('TagInput', 'GlobalValue');
    const ifWinnerComp = await getWinComp('IfWinner', 'If');
    const ifDrawComp = await getWinComp('IfDraw', 'If');
    const gameOverWriteComp = await getWinComp('GameOverWrite', 'ValueWrite');
    const gameOverSourceComp2 = await getWinComp('GameOverSource', 'ValueSource');
    const resultWriteComp = await getWinComp('ResultWrite', 'ObjectWrite');
    const resultSourceComp = await getWinComp('ResultSource', 'ObjectValueSource');
    const trueInputWinComp = await getWinComp('TrueInput', 'ValueInput');
    const oWinTextComp = await getWinComp('OWinText', 'ValueObjectInput');
    const xWinTextComp = await getWinComp('XWinText', 'ValueObjectInput');
    const drawTextComp = await getWinComp('DrawText', 'ValueObjectInput');
    const winnerConditionalComp = await getWinComp('WinnerConditional', 'ObjectConditional');
    const winnerMarkComp = await getWinComp('WinnerMark', 'ObjectValueSource');
    const or_01Comp = await getWinComp('Or_01', 'OR_Bool');
    const or_23Comp = await getWinComp('Or_23', 'OR_Bool');
    const or_45Comp = await getWinComp('Or_45', 'OR_Bool');
    const or_67Comp = await getWinComp('Or_67', 'OR_Bool');
    const or_0123Comp = await getWinComp('Or_0123', 'OR_Bool');
    const or_4567Comp = await getWinComp('Or_4567', 'OR_Bool');
    const orAllComp = await getWinComp('OrAll', 'OR_Bool');

    // Tag settings
    if (tagInputWinComp?.id) {
      await client.updateComponent({ id: tagInputWinComp.id, members: { Value: { $type: 'string', value: 'CheckWin' } } as any });
    }
    if (receiverWinComp?.id && tagInputWinComp?.id) {
      await client.updateComponent({
        id: receiverWinComp.id,
        members: { Tag: { $type: 'reference', targetId: tagInputWinComp.id } } as any,
      });
    }

    // Value settings
    if (trueInputWinComp?.id) {
      await client.updateComponent({ id: trueInputWinComp.id, members: { Value: { $type: 'bool', value: true } } as any });
    }
    if (oWinTextComp?.id) {
      await client.updateComponent({ id: oWinTextComp.id, members: { Value: { $type: 'string', value: 'O Wins!' } } as any });
    }
    if (xWinTextComp?.id) {
      await client.updateComponent({ id: xWinTextComp.id, members: { Value: { $type: 'string', value: 'X Wins!' } } as any });
    }
    if (drawTextComp?.id) {
      await client.updateComponent({ id: drawTextComp.id, members: { Value: { $type: 'string', value: 'Draw!' } } as any });
    }

    // GameOverSource/ResultSource GlobalReference settings
    if (gameOverSourceComp2?.id && isGameOverField?.id) {
      await client.addComponent({
        containerSlotId: gameOverSourceSlotId2,
        componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>',
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      const slotData = await client.getSlot({ slotId: gameOverSourceSlotId2, includeComponentData: true });
      const globalRefComp = findComponent(slotData.data, 'GlobalReference');
      const fieldDetails = await client.getComponent(isGameOverField.id);
      const valueId = fieldDetails.data?.members?.Value?.id;
      if (globalRefComp?.id && valueId) {
        await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
        await client.updateComponent({ id: gameOverSourceComp2.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
      }
    }

    if (resultSourceComp?.id && resultTextField?.id) {
      await client.addComponent({
        containerSlotId: resultSourceSlotId,
        componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>',
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      const slotData = await client.getSlot({ slotId: resultSourceSlotId, includeComponentData: true });
      const globalRefComp = findComponent(slotData.data, 'GlobalReference');
      const fieldDetails = await client.getComponent(resultTextField.id);
      const valueId = fieldDetails.data?.members?.Value?.id;
      if (globalRefComp?.id && valueId) {
        await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
        await client.updateComponent({ id: resultSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
      }
    }

    // Cell source settings and comparison connections for 8 lines
    const lineResults: any[] = [];
    for (let l = 0; l < 8; l++) {
      const [a, b, c] = lines[l];

      // CellA/B/C Source settings
      for (const [suffix, cellIdx] of [['CellA', a], ['CellB', b], ['CellC', c]] as const) {
        const cellSourceComp = await getWinComp(`L${l}_${suffix}`, 'ObjectValueSource');
        const cellField = cellFields[cellIdx];
        if (cellSourceComp?.id && cellField?.id) {
          const slotId = getWinSlotId(`L${l}_${suffix}`);
          await client.addComponent({
            containerSlotId: slotId,
            componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>',
          });
          await new Promise(resolve => setTimeout(resolve, 30));
          const slotData = await client.getSlot({ slotId, includeComponentData: true });
          const globalRefComp = findComponent(slotData.data, 'GlobalReference');
          const fieldDetails = await client.getComponent(cellField.id);
          const valueId = fieldDetails.data?.members?.Value?.id;
          if (globalRefComp?.id && valueId) {
            await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
            await client.updateComponent({ id: cellSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
          }
        }
      }

      const cellAComp = await getWinComp(`L${l}_CellA`, 'ObjectValueSource');
      const cellBComp = await getWinComp(`L${l}_CellB`, 'ObjectValueSource');
      const cellCComp = await getWinComp(`L${l}_CellC`, 'ObjectValueSource');
      const eqABComp = await getWinComp(`L${l}_EqAB`, 'ObjectEquals');
      const eqBCComp = await getWinComp(`L${l}_EqBC`, 'ObjectEquals');
      const notNullComp = await getWinComp(`L${l}_NotNull`, 'ObjectNotEquals');
      const and1Comp = await getWinComp(`L${l}_And1`, 'AND_Bool');
      const and2Comp = await getWinComp(`L${l}_And2`, 'AND_Bool');

      // EqAB: A == B
      if (eqABComp?.id && cellAComp?.id && cellBComp?.id) {
        await client.updateComponent({
          id: eqABComp.id,
          members: { A: { $type: 'reference', targetId: cellAComp.id }, B: { $type: 'reference', targetId: cellBComp.id } } as any,
        });
      }

      // EqBC: B == C
      if (eqBCComp?.id && cellBComp?.id && cellCComp?.id) {
        await client.updateComponent({
          id: eqBCComp.id,
          members: { A: { $type: 'reference', targetId: cellBComp.id }, B: { $type: 'reference', targetId: cellCComp.id } } as any,
        });
      }

      // NotNull: A != null (not connecting B makes it null comparison)
      if (notNullComp?.id && cellAComp?.id) {
        await client.updateComponent({
          id: notNullComp.id,
          members: { A: { $type: 'reference', targetId: cellAComp.id } } as any,
        });
      }

      // And1: EqAB AND EqBC
      if (and1Comp?.id && eqABComp?.id && eqBCComp?.id) {
        await client.updateComponent({
          id: and1Comp.id,
          members: { A: { $type: 'reference', targetId: eqABComp.id }, B: { $type: 'reference', targetId: eqBCComp.id } } as any,
        });
      }

      // And2: And1 AND NotNull (all 3 same AND not null)
      if (and2Comp?.id && and1Comp?.id && notNullComp?.id) {
        await client.updateComponent({
          id: and2Comp.id,
          members: { A: { $type: 'reference', targetId: and1Comp.id }, B: { $type: 'reference', targetId: notNullComp.id } } as any,
        });
      }

      lineResults.push(and2Comp);
    }

    // OR chain: OR 8 lines in pairs -> OR 4 in pairs -> final OR
    // Or_01: line0 OR line1
    if (or_01Comp?.id && lineResults[0]?.id && lineResults[1]?.id) {
      await client.updateComponent({
        id: or_01Comp.id,
        members: { A: { $type: 'reference', targetId: lineResults[0].id }, B: { $type: 'reference', targetId: lineResults[1].id } } as any,
      });
    }
    // Or_23: line2 OR line3
    if (or_23Comp?.id && lineResults[2]?.id && lineResults[3]?.id) {
      await client.updateComponent({
        id: or_23Comp.id,
        members: { A: { $type: 'reference', targetId: lineResults[2].id }, B: { $type: 'reference', targetId: lineResults[3].id } } as any,
      });
    }
    // Or_45: line4 OR line5
    if (or_45Comp?.id && lineResults[4]?.id && lineResults[5]?.id) {
      await client.updateComponent({
        id: or_45Comp.id,
        members: { A: { $type: 'reference', targetId: lineResults[4].id }, B: { $type: 'reference', targetId: lineResults[5].id } } as any,
      });
    }
    // Or_67: line6 OR line7
    if (or_67Comp?.id && lineResults[6]?.id && lineResults[7]?.id) {
      await client.updateComponent({
        id: or_67Comp.id,
        members: { A: { $type: 'reference', targetId: lineResults[6].id }, B: { $type: 'reference', targetId: lineResults[7].id } } as any,
      });
    }
    // Or_0123: Or_01 OR Or_23
    if (or_0123Comp?.id && or_01Comp?.id && or_23Comp?.id) {
      await client.updateComponent({
        id: or_0123Comp.id,
        members: { A: { $type: 'reference', targetId: or_01Comp.id }, B: { $type: 'reference', targetId: or_23Comp.id } } as any,
      });
    }
    // Or_4567: Or_45 OR Or_67
    if (or_4567Comp?.id && or_45Comp?.id && or_67Comp?.id) {
      await client.updateComponent({
        id: or_4567Comp.id,
        members: { A: { $type: 'reference', targetId: or_45Comp.id }, B: { $type: 'reference', targetId: or_67Comp.id } } as any,
      });
    }
    // OrAll: Or_0123 OR Or_4567
    if (orAllComp?.id && or_0123Comp?.id && or_4567Comp?.id) {
      await client.updateComponent({
        id: orAllComp.id,
        members: { A: { $type: 'reference', targetId: or_0123Comp.id }, B: { $type: 'reference', targetId: or_4567Comp.id } } as any,
      });
    }

    // Draw determination cell source settings
    const drawNotNullComps: any[] = [];
    for (let c = 0; c < 9; c++) {
      const cellSourceComp = await getWinComp(`Draw_Cell${c}`, 'ObjectValueSource');
      const cellField = cellFields[c];
      if (cellSourceComp?.id && cellField?.id) {
        const slotId = getWinSlotId(`Draw_Cell${c}`);
        await client.addComponent({
          containerSlotId: slotId,
          componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>',
        });
        await new Promise(resolve => setTimeout(resolve, 30));
        const slotData = await client.getSlot({ slotId, includeComponentData: true });
        const globalRefComp = findComponent(slotData.data, 'GlobalReference');
        const fieldDetails = await client.getComponent(cellField.id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (globalRefComp?.id && valueId) {
          await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
          await client.updateComponent({ id: cellSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
        }
      }

      const notNullComp = await getWinComp(`Draw_NotNull${c}`, 'ObjectNotEquals');
      if (notNullComp?.id && cellSourceComp?.id) {
        await client.updateComponent({
          id: notNullComp.id,
          members: { A: { $type: 'reference', targetId: cellSourceComp.id } } as any,
        });
      }
      drawNotNullComps.push(notNullComp);
    }

    // AND chain: Check if all 9 cells are not null
    // Draw_And_01: NotNull0 AND NotNull1
    const drawAnd_01Comp = await getWinComp('Draw_And_01', 'AND_Bool');
    if (drawAnd_01Comp?.id && drawNotNullComps[0]?.id && drawNotNullComps[1]?.id) {
      await client.updateComponent({
        id: drawAnd_01Comp.id,
        members: { A: { $type: 'reference', targetId: drawNotNullComps[0].id }, B: { $type: 'reference', targetId: drawNotNullComps[1].id } } as any,
      });
    }
    // Draw_And_012: Draw_And_01 AND NotNull2
    const drawAnd_012Comp = await getWinComp('Draw_And_012', 'AND_Bool');
    if (drawAnd_012Comp?.id && drawAnd_01Comp?.id && drawNotNullComps[2]?.id) {
      await client.updateComponent({
        id: drawAnd_012Comp.id,
        members: { A: { $type: 'reference', targetId: drawAnd_01Comp.id }, B: { $type: 'reference', targetId: drawNotNullComps[2].id } } as any,
      });
    }
    // Draw_And_0123: Draw_And_012 AND NotNull3
    const drawAnd_0123Comp = await getWinComp('Draw_And_0123', 'AND_Bool');
    if (drawAnd_0123Comp?.id && drawAnd_012Comp?.id && drawNotNullComps[3]?.id) {
      await client.updateComponent({
        id: drawAnd_0123Comp.id,
        members: { A: { $type: 'reference', targetId: drawAnd_012Comp.id }, B: { $type: 'reference', targetId: drawNotNullComps[3].id } } as any,
      });
    }
    // Draw_And_01234: Draw_And_0123 AND NotNull4
    const drawAnd_01234Comp = await getWinComp('Draw_And_01234', 'AND_Bool');
    if (drawAnd_01234Comp?.id && drawAnd_0123Comp?.id && drawNotNullComps[4]?.id) {
      await client.updateComponent({
        id: drawAnd_01234Comp.id,
        members: { A: { $type: 'reference', targetId: drawAnd_0123Comp.id }, B: { $type: 'reference', targetId: drawNotNullComps[4].id } } as any,
      });
    }
    // Draw_And_012345: Draw_And_01234 AND NotNull5
    const drawAnd_012345Comp = await getWinComp('Draw_And_012345', 'AND_Bool');
    if (drawAnd_012345Comp?.id && drawAnd_01234Comp?.id && drawNotNullComps[5]?.id) {
      await client.updateComponent({
        id: drawAnd_012345Comp.id,
        members: { A: { $type: 'reference', targetId: drawAnd_01234Comp.id }, B: { $type: 'reference', targetId: drawNotNullComps[5].id } } as any,
      });
    }
    // Draw_And_0123456: Draw_And_012345 AND NotNull6
    const drawAnd_0123456Comp = await getWinComp('Draw_And_0123456', 'AND_Bool');
    if (drawAnd_0123456Comp?.id && drawAnd_012345Comp?.id && drawNotNullComps[6]?.id) {
      await client.updateComponent({
        id: drawAnd_0123456Comp.id,
        members: { A: { $type: 'reference', targetId: drawAnd_012345Comp.id }, B: { $type: 'reference', targetId: drawNotNullComps[6].id } } as any,
      });
    }
    // Draw_And_01234567: Draw_And_0123456 AND NotNull7
    const drawAnd_01234567Comp = await getWinComp('Draw_And_01234567', 'AND_Bool');
    if (drawAnd_01234567Comp?.id && drawAnd_0123456Comp?.id && drawNotNullComps[7]?.id) {
      await client.updateComponent({
        id: drawAnd_01234567Comp.id,
        members: { A: { $type: 'reference', targetId: drawAnd_0123456Comp.id }, B: { $type: 'reference', targetId: drawNotNullComps[7].id } } as any,
      });
    }
    // Draw_AndAll: Draw_And_01234567 AND NotNull8
    const drawAndAllComp = await getWinComp('Draw_AndAll', 'AND_Bool');
    if (drawAndAllComp?.id && drawAnd_01234567Comp?.id && drawNotNullComps[8]?.id) {
      await client.updateComponent({
        id: drawAndAllComp.id,
        members: { A: { $type: 'reference', targetId: drawAnd_01234567Comp.id }, B: { $type: 'reference', targetId: drawNotNullComps[8].id } } as any,
      });
    }

    // Draw_NotWin: NOT(there is a winner)
    const drawNotWinComp = await getWinComp('Draw_NotWin', 'NOT_Bool');
    if (drawNotWinComp?.id && orAllComp?.id) {
      await client.updateComponent({
        id: drawNotWinComp.id,
        members: { A: { $type: 'reference', targetId: orAllComp.id } } as any,
      });
    }

    // Draw_Final: all cells filled AND no winner
    const drawFinalComp = await getWinComp('Draw_Final', 'AND_Bool');
    if (drawFinalComp?.id && drawAndAllComp?.id && drawNotWinComp?.id) {
      await client.updateComponent({
        id: drawFinalComp.id,
        members: { A: { $type: 'reference', targetId: drawAndAllComp.id }, B: { $type: 'reference', targetId: drawNotWinComp.id } } as any,
      });
    }

    // WinnerMark: Use CellA of winning line 0 (first line)
    // Note: Determining which line won is complex, so we simplify using TurnSource
    // The winner is the previous turn's player, so the opposite of current turn
    // TurnSource = isOTurn, so winner is NOT(isOTurn) ? "O" : "X"
    // However, at win determination time turn has already switched, so isOTurn ? "X" : "O"

    // WinnerConditional settings: isOTurn ? "X Wins" : "O Wins"
    // Add ValueSource<bool> for winner mark
    await client.addSlot({ parentId: winCheckId, name: 'WinnerTurnSource' });
    const winnerTurnSourceSlotId = await getChildSlotId(client, winCheckId, 'WinnerTurnSource');
    await client.addComponent({ containerSlotId: winnerTurnSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });

    await new Promise(resolve => setTimeout(resolve, 50));
    const winnerTurnSourceData = await client.getSlot({ slotId: winnerTurnSourceSlotId, includeComponentData: true });
    const winnerTurnSourceComp = findComponent(winnerTurnSourceData.data, 'ValueSource');

    if (winnerTurnSourceComp?.id && isOTurnField?.id) {
      await client.addComponent({
        containerSlotId: winnerTurnSourceSlotId,
        componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>',
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      const slotData = await client.getSlot({ slotId: winnerTurnSourceSlotId, includeComponentData: true });
      const globalRefComp = findComponent(slotData.data, 'GlobalReference');
      const fieldDetails = await client.getComponent(isOTurnField.id);
      const valueId = fieldDetails.data?.members?.Value?.id;
      if (globalRefComp?.id && valueId) {
        await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
        await client.updateComponent({ id: winnerTurnSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
      }
    }

    // WinnerConditional: isOTurn(current) ? "X Wins" : "O Wins"
    // At win determination time turn has switched, so if isOTurn=true then X wins
    if (winnerConditionalComp?.id && winnerTurnSourceComp?.id && xWinTextComp?.id && oWinTextComp?.id) {
      await client.updateComponent({
        id: winnerConditionalComp.id,
        members: {
          Condition: { $type: 'reference', targetId: winnerTurnSourceComp.id },
          OnTrue: { $type: 'reference', targetId: xWinTextComp.id },  // isOTurn=true -> X wins
          OnFalse: { $type: 'reference', targetId: oWinTextComp.id }, // isOTurn=false -> O wins
        } as any,
      });
    }

    // Execution flow connections
    // Receiver.OnTriggered → IfWinner
    if (receiverWinComp?.id && ifWinnerComp?.id) {
      const details = await client.getComponent(receiverWinComp.id);
      const onTriggeredId = details.data?.members?.OnTriggered?.id;
      await client.updateComponent({
        id: receiverWinComp.id,
        members: { OnTriggered: { $type: 'reference', id: onTriggeredId, targetId: ifWinnerComp.id } } as any,
      });
    }

    // IfWinner.Condition <- OrAll (is there a winner)
    if (ifWinnerComp?.id && orAllComp?.id) {
      await client.updateComponent({
        id: ifWinnerComp.id,
        members: { Condition: { $type: 'reference', targetId: orAllComp.id } } as any,
      });
    }

    // IfWinner.OnTrue -> GameOverWrite (winner exists)
    if (ifWinnerComp?.id && gameOverWriteComp?.id) {
      const details = await client.getComponent(ifWinnerComp.id);
      const onTrueId = details.data?.members?.OnTrue?.id;
      await client.updateComponent({
        id: ifWinnerComp.id,
        members: { OnTrue: { $type: 'reference', id: onTrueId, targetId: gameOverWriteComp.id } } as any,
      });
    }

    // IfWinner.OnFalse -> IfDraw (no winner -> check draw)
    if (ifWinnerComp?.id && ifDrawComp?.id) {
      const details = await client.getComponent(ifWinnerComp.id);
      const onFalseId = details.data?.members?.OnFalse?.id;
      await client.updateComponent({
        id: ifWinnerComp.id,
        members: { OnFalse: { $type: 'reference', id: onFalseId, targetId: ifDrawComp.id } } as any,
      });
    }

    // GameOverWrite settings
    if (gameOverWriteComp?.id && gameOverSourceComp2?.id && trueInputWinComp?.id) {
      await client.updateComponent({
        id: gameOverWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: gameOverSourceComp2.id },
          Value: { $type: 'reference', targetId: trueInputWinComp.id },
        } as any,
      });
    }

    // GameOverWrite.OnWritten → ResultWrite
    if (gameOverWriteComp?.id && resultWriteComp?.id) {
      const details = await client.getComponent(gameOverWriteComp.id);
      const onWrittenId = details.data?.members?.OnWritten?.id;
      await client.updateComponent({
        id: gameOverWriteComp.id,
        members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: resultWriteComp.id } } as any,
      });
    }

    // ResultWrite settings (winner text)
    if (resultWriteComp?.id && resultSourceComp?.id && winnerConditionalComp?.id) {
      await client.updateComponent({
        id: resultWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: resultSourceComp.id },
          Value: { $type: 'reference', targetId: winnerConditionalComp.id },
        } as any,
      });
    }

    // IfDraw.Condition <- Draw_Final (is it a draw)
    if (ifDrawComp?.id && drawFinalComp?.id) {
      await client.updateComponent({
        id: ifDrawComp.id,
        members: { Condition: { $type: 'reference', targetId: drawFinalComp.id } } as any,
      });
    }

    // IfDraw.OnTrue -> Draw GameOverWrite
    // Add GameOverWrite and ResultWrite for draw
    await client.addSlot({ parentId: winCheckId, name: 'DrawGameOverWrite' });
    await client.addSlot({ parentId: winCheckId, name: 'DrawResultWrite' });
    const drawGameOverWriteSlotId = await getChildSlotId(client, winCheckId, 'DrawGameOverWrite');
    const drawResultWriteSlotId = await getChildSlotId(client, winCheckId, 'DrawResultWrite');

    await client.addComponent({ containerSlotId: drawGameOverWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>' });
    await client.addComponent({ containerSlotId: drawResultWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });

    await new Promise(resolve => setTimeout(resolve, 50));
    const drawGameOverWriteData = await client.getSlot({ slotId: drawGameOverWriteSlotId, includeComponentData: true });
    const drawGameOverWriteComp = findComponent(drawGameOverWriteData.data, 'ValueWrite');
    const drawResultWriteData = await client.getSlot({ slotId: drawResultWriteSlotId, includeComponentData: true });
    const drawResultWriteComp = findComponent(drawResultWriteData.data, 'ObjectWrite');

    // IfDraw.OnTrue → DrawGameOverWrite
    if (ifDrawComp?.id && drawGameOverWriteComp?.id) {
      const details = await client.getComponent(ifDrawComp.id);
      const onTrueId = details.data?.members?.OnTrue?.id;
      await client.updateComponent({
        id: ifDrawComp.id,
        members: { OnTrue: { $type: 'reference', id: onTrueId, targetId: drawGameOverWriteComp.id } } as any,
      });
    }

    // DrawGameOverWrite settings
    if (drawGameOverWriteComp?.id && gameOverSourceComp2?.id && trueInputWinComp?.id) {
      await client.updateComponent({
        id: drawGameOverWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: gameOverSourceComp2.id },
          Value: { $type: 'reference', targetId: trueInputWinComp.id },
        } as any,
      });
    }

    // DrawGameOverWrite.OnWritten → DrawResultWrite
    if (drawGameOverWriteComp?.id && drawResultWriteComp?.id) {
      const details = await client.getComponent(drawGameOverWriteComp.id);
      const onWrittenId = details.data?.members?.OnWritten?.id;
      await client.updateComponent({
        id: drawGameOverWriteComp.id,
        members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: drawResultWriteComp.id } } as any,
      });
    }

    // DrawResultWrite settings (draw text)
    if (drawResultWriteComp?.id && resultSourceComp?.id && drawTextComp?.id) {
      await client.updateComponent({
        id: drawResultWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: resultSourceComp.id },
          Value: { $type: 'reference', targetId: drawTextComp.id },
        } as any,
      });
    }

    console.log('  Win check logic created');

    // Reset logic
    await client.addSlot({ parentId: fluxId, name: 'Reset', position: { x: 5, y: 0, z: 0 } });
    const resetId = await getChildSlotId(client, fluxId, 'Reset');

    // Create reset nodes
    // EmptyStr not needed - not connecting ObjectWrite.Value writes null
    const resetNodeNames = ['Receiver', 'TagInput', 'TrueInput', 'FalseInput'];
    // 9 cells clear + 1 turn reset + isGameOver/resultText reset
    for (let i = 0; i < 9; i++) {
      resetNodeNames.push(`CellSource_${i}`, `CellWrite_${i}`);
    }
    resetNodeNames.push('TurnSource', 'TurnWrite');
    resetNodeNames.push('GameOverSource', 'GameOverWrite', 'ResultSource', 'ResultWrite');

    for (const name of resetNodeNames) {
      await client.addSlot({ parentId: resetId, name });
    }

    const resetSlotData = await client.getSlot({ slotId: resetId, depth: 1 });
    const getResetSlotId = (name: string) => resetSlotData.data?.children?.find((c: any) => c.name?.value === name)?.id;

    const resetReceiverSlotId = getResetSlotId('Receiver');
    const resetTagInputSlotId = getResetSlotId('TagInput');
    const resetTrueInputSlotId = getResetSlotId('TrueInput');
    const resetFalseInputSlotId = getResetSlotId('FalseInput');
    const resetGameOverSourceSlotId = getResetSlotId('GameOverSource');
    const resetGameOverWriteSlotId = getResetSlotId('GameOverWrite');
    const resetResultSourceSlotId = getResetSlotId('ResultSource');
    const resetResultWriteSlotId = getResetSlotId('ResultWrite');

    // Add basic components
    await client.addComponent({ containerSlotId: resetReceiverSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver' });
    await client.addComponent({ containerSlotId: resetTagInputSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>' });
    await client.addComponent({ containerSlotId: resetTrueInputSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<bool>' });
    await client.addComponent({ containerSlotId: resetFalseInputSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<bool>' });
    // GameOver Source + Write
    await client.addComponent({ containerSlotId: resetGameOverSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
    await client.addComponent({ containerSlotId: resetGameOverSourceSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>' });
    await client.addComponent({ containerSlotId: resetGameOverWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>' });
    // ResultText Source + Write
    await client.addComponent({ containerSlotId: resetResultSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
    await client.addComponent({ containerSlotId: resetResultSourceSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>' });
    await client.addComponent({ containerSlotId: resetResultWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });

    // Add Source + Write for each cell
    const cellWriteComps: any[] = [];
    for (let i = 0; i < 9; i++) {
      const cellSourceSlotId = getResetSlotId(`CellSource_${i}`);
      const cellWriteSlotId = getResetSlotId(`CellWrite_${i}`);

      // ObjectValueSource + GlobalReference
      await client.addComponent({ containerSlotId: cellSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: cellSourceSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>' });
      // ObjectWrite (FrooxEngineContext)
      await client.addComponent({ containerSlotId: cellWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });

      await new Promise(resolve => setTimeout(resolve, 30));

      // Get components
      const cellSourceData = await client.getSlot({ slotId: cellSourceSlotId, includeComponentData: true });
      const cellSourceComp = findComponent(cellSourceData.data, 'ObjectValueSource');
      const cellGlobalRefComp = findComponent(cellSourceData.data, 'GlobalReference');
      const cellWriteData = await client.getSlot({ slotId: cellWriteSlotId, includeComponentData: true });
      const cellWriteComp = findComponent(cellWriteData.data, 'ObjectWrite');

      // Get cellFields[i] Value ID
      if (cellFields[i]?.id) {
        const cellFieldDetails = await client.getComponent(cellFields[i].id);
        const cellValueId = cellFieldDetails.data?.members?.Value?.id;

        if (cellGlobalRefComp?.id && cellValueId) {
          await client.updateComponent({
            id: cellGlobalRefComp.id,
            members: { Reference: { $type: 'reference', targetId: cellValueId } } as any,
          });
        }
        if (cellSourceComp?.id && cellGlobalRefComp?.id) {
          await client.updateComponent({
            id: cellSourceComp.id,
            members: { Source: { $type: 'reference', targetId: cellGlobalRefComp.id } } as any,
          });
        }
      }

      cellWriteComps.push({ sourceComp: cellSourceComp, writeComp: cellWriteComp });
    }

    // Turn Source + Write
    const resetTurnSourceSlotId = getResetSlotId('TurnSource');
    const resetTurnWriteSlotId = getResetSlotId('TurnWrite');

    await client.addComponent({ containerSlotId: resetTurnSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
    await client.addComponent({ containerSlotId: resetTurnSourceSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>' });
    await client.addComponent({ containerSlotId: resetTurnWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>' });

    await new Promise(resolve => setTimeout(resolve, 30));

    const resetTurnSourceData = await client.getSlot({ slotId: resetTurnSourceSlotId, includeComponentData: true });
    const resetTurnSourceComp = findComponent(resetTurnSourceData.data, 'ValueSource');
    const resetTurnGlobalRefComp = findComponent(resetTurnSourceData.data, 'GlobalReference');
    const resetTurnWriteData = await client.getSlot({ slotId: resetTurnWriteSlotId, includeComponentData: true });
    const resetTurnWriteComp = findComponent(resetTurnWriteData.data, 'ValueWrite');

    if (isOTurnField?.id && resetTurnGlobalRefComp?.id) {
      const turnFieldDetails = await client.getComponent(isOTurnField.id);
      const turnValueId = turnFieldDetails.data?.members?.Value?.id;

      if (turnValueId) {
        await client.updateComponent({
          id: resetTurnGlobalRefComp.id,
          members: { Reference: { $type: 'reference', targetId: turnValueId } } as any,
        });
      }
      if (resetTurnSourceComp?.id) {
        await client.updateComponent({
          id: resetTurnSourceComp.id,
          members: { Source: { $type: 'reference', targetId: resetTurnGlobalRefComp.id } } as any,
        });
      }
    }

    // Get basic components
    const resetReceiverData2 = await client.getSlot({ slotId: resetReceiverSlotId, includeComponentData: true });
    const resetReceiverComp = findComponent(resetReceiverData2.data, 'DynamicImpulseReceiver');
    const resetTagInputData = await client.getSlot({ slotId: resetTagInputSlotId, includeComponentData: true });
    const resetTagInputComp = findComponent(resetTagInputData.data, 'GlobalValue');
    const resetTrueInputData = await client.getSlot({ slotId: resetTrueInputSlotId, includeComponentData: true });
    const resetTrueInputComp = findComponent(resetTrueInputData.data, 'ValueInput');

    // Value settings
    if (resetTagInputComp?.id) {
      await client.updateComponent({
        id: resetTagInputComp.id,
        members: { Value: { $type: 'string', value: 'Reset' } } as any,
      });
    }
    if (resetTrueInputComp?.id) {
      await client.updateComponent({
        id: resetTrueInputComp.id,
        members: { Value: { $type: 'bool', value: true } } as any,
      });
    }

    // Receiver.Tag connection
    if (resetReceiverComp?.id && resetTagInputComp?.id) {
      await client.updateComponent({
        id: resetReceiverComp.id,
        members: { Tag: { $type: 'reference', targetId: resetTagInputComp.id } } as any,
      });
    }

    // Execution flow connections: Receiver → CellWrite_0 → CellWrite_1 → ... → CellWrite_8 → TurnWrite
    // Connect Variable/Value for each CellWrite + OnWritten connection
    let prevWriteComp = null;
    for (let i = 0; i < 9; i++) {
      const { sourceComp, writeComp } = cellWriteComps[i];
      if (!writeComp?.id) continue;

      // Variable <- Source, Value is not connected (null is written)
      if (sourceComp?.id) {
        await client.updateComponent({
          id: writeComp.id,
          members: {
            Variable: { $type: 'reference', targetId: sourceComp.id },
            // Value is not connected (null)
          } as any,
        });
      }

      // Connection from previous node
      if (i === 0 && resetReceiverComp?.id) {
        // Receiver.OnTriggered → CellWrite_0
        const receiverDetails = await client.getComponent(resetReceiverComp.id);
        const onTriggeredId = receiverDetails.data?.members?.OnTriggered?.id;
        await client.updateComponent({
          id: resetReceiverComp.id,
          members: { OnTriggered: { $type: 'reference', id: onTriggeredId, targetId: writeComp.id } } as any,
        });
      } else if (prevWriteComp?.id) {
        // prevWrite.OnWritten → currentWrite
        const prevDetails = await client.getComponent(prevWriteComp.id);
        const onWrittenId = prevDetails.data?.members?.OnWritten?.id;
        await client.updateComponent({
          id: prevWriteComp.id,
          members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: writeComp.id } } as any,
        });
      }

      prevWriteComp = writeComp;
    }

    // Last CellWrite -> TurnWrite
    if (prevWriteComp?.id && resetTurnWriteComp?.id) {
      const prevDetails = await client.getComponent(prevWriteComp.id);
      const onWrittenId = prevDetails.data?.members?.OnWritten?.id;
      await client.updateComponent({
        id: prevWriteComp.id,
        members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: resetTurnWriteComp.id } } as any,
      });
    }

    // TurnWrite: Variable ← TurnSource, Value ← TrueInput
    if (resetTurnWriteComp?.id && resetTurnSourceComp?.id && resetTrueInputComp?.id) {
      await client.updateComponent({
        id: resetTurnWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: resetTurnSourceComp.id },
          Value: { $type: 'reference', targetId: resetTrueInputComp.id },
        } as any,
      });
    }

    // FalseInput/GameOver/Result component retrieval and settings
    await new Promise(resolve => setTimeout(resolve, 50));

    const resetFalseInputData = await client.getSlot({ slotId: resetFalseInputSlotId, includeComponentData: true });
    const resetFalseInputComp = findComponent(resetFalseInputData.data, 'ValueInput');
    const resetGameOverSourceData = await client.getSlot({ slotId: resetGameOverSourceSlotId, includeComponentData: true });
    const resetGameOverSourceComp = findComponent(resetGameOverSourceData.data, 'ValueSource');
    const resetGameOverGlobalRefComp = findComponent(resetGameOverSourceData.data, 'GlobalReference');
    const resetGameOverWriteData = await client.getSlot({ slotId: resetGameOverWriteSlotId, includeComponentData: true });
    const resetGameOverWriteComp = findComponent(resetGameOverWriteData.data, 'ValueWrite');
    const resetResultSourceData = await client.getSlot({ slotId: resetResultSourceSlotId, includeComponentData: true });
    const resetResultSourceComp = findComponent(resetResultSourceData.data, 'ObjectValueSource');
    const resetResultGlobalRefComp = findComponent(resetResultSourceData.data, 'GlobalReference');
    const resetResultWriteData = await client.getSlot({ slotId: resetResultWriteSlotId, includeComponentData: true });
    const resetResultWriteComp = findComponent(resetResultWriteData.data, 'ObjectWrite');

    // FalseInput value settings
    if (resetFalseInputComp?.id) {
      await client.updateComponent({
        id: resetFalseInputComp.id,
        members: { Value: { $type: 'bool', value: false } } as any,
      });
    }

    // GameOverSource GlobalReference settings
    if (resetGameOverGlobalRefComp?.id && isGameOverField?.id) {
      const fieldDetails = await client.getComponent(isGameOverField.id);
      const valueId = fieldDetails.data?.members?.Value?.id;
      if (valueId) {
        await client.updateComponent({
          id: resetGameOverGlobalRefComp.id,
          members: { Reference: { $type: 'reference', targetId: valueId } } as any,
        });
        if (resetGameOverSourceComp?.id) {
          await client.updateComponent({
            id: resetGameOverSourceComp.id,
            members: { Source: { $type: 'reference', targetId: resetGameOverGlobalRefComp.id } } as any,
          });
        }
      }
    }

    // ResultSource GlobalReference settings
    if (resetResultGlobalRefComp?.id && resultTextField?.id) {
      const fieldDetails = await client.getComponent(resultTextField.id);
      const valueId = fieldDetails.data?.members?.Value?.id;
      if (valueId) {
        await client.updateComponent({
          id: resetResultGlobalRefComp.id,
          members: { Reference: { $type: 'reference', targetId: valueId } } as any,
        });
        if (resetResultSourceComp?.id) {
          await client.updateComponent({
            id: resetResultSourceComp.id,
            members: { Source: { $type: 'reference', targetId: resetResultGlobalRefComp.id } } as any,
          });
        }
      }
    }

    // TurnWrite.OnWritten → GameOverWrite
    if (resetTurnWriteComp?.id && resetGameOverWriteComp?.id) {
      const details = await client.getComponent(resetTurnWriteComp.id);
      const onWrittenId = details.data?.members?.OnWritten?.id;
      await client.updateComponent({
        id: resetTurnWriteComp.id,
        members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: resetGameOverWriteComp.id } } as any,
      });
    }

    // GameOverWrite: Variable ← GameOverSource, Value ← FalseInput
    if (resetGameOverWriteComp?.id && resetGameOverSourceComp?.id && resetFalseInputComp?.id) {
      await client.updateComponent({
        id: resetGameOverWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: resetGameOverSourceComp.id },
          Value: { $type: 'reference', targetId: resetFalseInputComp.id },
        } as any,
      });
    }

    // GameOverWrite.OnWritten → ResultWrite
    if (resetGameOverWriteComp?.id && resetResultWriteComp?.id) {
      const details = await client.getComponent(resetGameOverWriteComp.id);
      const onWrittenId = details.data?.members?.OnWritten?.id;
      await client.updateComponent({
        id: resetGameOverWriteComp.id,
        members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: resetResultWriteComp.id } } as any,
      });
    }

    // ResultWrite: Variable <- ResultSource, Value is not connected (null)
    if (resetResultWriteComp?.id && resetResultSourceComp?.id) {
      await client.updateComponent({
        id: resetResultWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: resetResultSourceComp.id },
          // Value is not connected (writes null)
        } as any,
      });
    }

    console.log('  Reset logic created and connected (includes GameOver/Result reset)');
    console.log('  ProtoFlux logic created and connected');

    // ========== Complete ==========
    console.log('\n========================================');
    console.log('=== Tic-Tac-Toe Game Created! ===');
    console.log('========================================');
    console.log(`\nLocation: ${slotName}`);
    console.log('\n[Features]');
    console.log('- Cell click: Place O/X alternately');
    console.log('- Empty cell check: Cannot click cells that already have marks');
    console.log('- Game over check: Cannot click after win/lose is determined');
    console.log('- Turn display: Shows current turn');
    console.log('- Win determination: Check 8 lines (3 rows, 3 columns, 2 diagonals)');
    console.log('- Draw determination: When all cells filled with no winner');
    console.log('- Result display: Shows winner or draw');
    console.log('- Reset button: Clear all cells + initialize game state');

  } finally {
    client.disconnect();
  }
}

main();
