/**
 * Connect 4 Game Creation Script
 * 7 columns x 6 rows board with gravity-based piece dropping
 *
 * Usage: npx tsx src/scripts/create-connect4.ts [ws://localhost:3343]
 */
import { ResoniteLinkClient } from '../client.js';

const WS_URL = process.argv[2] || 'ws://localhost:3343';

const COLS = 7;
const ROWS = 6;
const TOTAL_CELLS = COLS * ROWS; // 42

// Colors for pieces
const RED_COLOR = { r: 0.9, g: 0.2, b: 0.2, a: 1 };
const YELLOW_COLOR = { r: 0.95, g: 0.85, b: 0.1, a: 1 };
const TRANSPARENT_COLOR = { r: 0, g: 0, b: 0, a: 0 };

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

// Helper: Get child slot ID
async function getChildSlotId(client: ResoniteLinkClient, parentId: string, name: string): Promise<string> {
  const data = await client.getSlot({ slotId: parentId, depth: 1 });
  const child = data.data?.children?.find((c: any) => c.name?.value === name);
  if (!child?.id) throw new Error(`Child slot "${name}" not found in ${parentId}`);
  return child.id;
}

// Cell index from row/col (row 0 = bottom, row 5 = top)
function cellIndex(row: number, col: number): number {
  return row * COLS + col;
}

async function main() {
  const client = new ResoniteLinkClient({ url: WS_URL });
  await client.connect();

  try {
    console.log('Creating Connect 4 Game...\n');

    // ========== 1. Create main slot ==========
    const slotName = `Connect4_${Date.now()}`;
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
        members: { Size: { $type: 'float2', value: { x: 560, y: 600 } } } as any,
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

    // ========== 3. GameState slot ==========
    await client.addSlot({ parentId: mainId, name: 'GameState' });
    const gameStateId = await getChildSlotId(client, mainId, 'GameState');

    // isRedTurn (whether it's Red's turn)
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<bool>' });
    // isGameOver
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<bool>' });

    // 42 cell states (ValueField<string>) - for game logic
    for (let i = 0; i < TOTAL_CELLS; i++) {
      await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' });
    }
    // 42 cell colors (ValueField<colorX>) - for piece display
    for (let i = 0; i < TOTAL_CELLS; i++) {
      await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<colorX>' });
    }
    // resultText
    await client.addComponent({ containerSlotId: gameStateId, componentType: '[FrooxEngine]FrooxEngine.ValueField<string>' });

    let gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
    const boolFields = findComponents(gameStateData.data, 'ValueField<bool>');
    const stringFields = findComponents(gameStateData.data, 'ValueField<string>');
    const colorFields = findComponents(gameStateData.data, 'ValueField<colorX>');
    const isRedTurnField = boolFields[0];
    const isGameOverField = boolFields[1];
    const cellFields = stringFields.slice(0, TOTAL_CELLS);
    const cellColorFields = colorFields.slice(0, TOTAL_CELLS);
    const resultTextField = stringFields[TOTAL_CELLS];

    if (isRedTurnField?.id) {
      await client.updateComponent({
        id: isRedTurnField.id,
        members: { Value: { $type: 'bool', value: true } } as any,
      });
    }
    if (isGameOverField?.id) {
      await client.updateComponent({
        id: isGameOverField.id,
        members: { Value: { $type: 'bool', value: false } } as any,
      });
    }
    // Initialize all cell colors to transparent
    for (const colorField of cellColorFields) {
      if (colorField?.id) {
        await client.updateComponent({
          id: colorField.id,
          members: { Value: { $type: 'colorX', value: TRANSPARENT_COLOR } } as any,
        });
      }
    }
    console.log(`  GameState: isRedTurn=${isRedTurnField?.id}, cells=${cellFields.length}, colors=${cellColorFields.length}`);

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
          Tint: { $type: 'colorX', value: { r: 0.05, g: 0.1, b: 0.2, a: 0.98 } },
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
          OffsetMin: { $type: 'float2', value: { x: 15, y: 15 } },
          OffsetMax: { $type: 'float2', value: { x: -15, y: -15 } },
        } as any,
      });
    }
    if (vLayout?.id) {
      await client.updateComponent({
        id: vLayout.id,
        members: {
          Spacing: { $type: 'float', value: 8 },
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
        members: { PreferredHeight: { $type: 'float', value: 45 } } as any,
      });
    }
    if (headerText?.id) {
      await client.updateComponent({
        id: headerText.id,
        members: {
          Content: { $type: 'string', value: 'Connect 4' },
          Size: { $type: 'float', value: 32 },
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
        members: { PreferredHeight: { $type: 'float', value: 30 } } as any,
      });
    }
    if (turnText?.id) {
      await client.updateComponent({
        id: turnText.id,
        members: {
          Content: { $type: 'string', value: "Red's Turn" },
          Size: { $type: 'float', value: 22 },
          Color: { $type: 'colorX', value: { r: 1, g: 0.4, b: 0.4, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
        } as any,
      });
    }
    console.log('  TurnDisplay created');

    // ========== 7.5. ResultDisplay ==========
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
        members: { PreferredHeight: { $type: 'float', value: 30 } } as any,
      });
    }
    if (resultText?.id) {
      await client.updateComponent({
        id: resultText.id,
        members: {
          Content: { $type: 'string', value: '' },
          Size: { $type: 'float', value: 26 },
          Color: { $type: 'colorX', value: { r: 1, g: 0.9, b: 0.3, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
        } as any,
      });
    }
    console.log('  ResultDisplay created');

    // ========== 8. Column Buttons ==========
    await client.addSlot({ parentId: contentId, name: 'ColumnButtons' });
    const colBtnsId = await getChildSlotId(client, contentId, 'ColumnButtons');

    await client.addComponent({ containerSlotId: colBtnsId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: colBtnsId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: colBtnsId, componentType: '[FrooxEngine]FrooxEngine.UIX.HorizontalLayout' });

    let colBtnsData = await client.getSlot({ slotId: colBtnsId, includeComponentData: true });
    const colBtnsLayout = findComponent(colBtnsData.data, 'LayoutElement');
    const colBtnsHLayout = findComponent(colBtnsData.data, 'HorizontalLayout');

    if (colBtnsLayout?.id) {
      await client.updateComponent({
        id: colBtnsLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 40 } } as any,
      });
    }
    if (colBtnsHLayout?.id) {
      await client.updateComponent({
        id: colBtnsHLayout.id,
        members: {
          Spacing: { $type: 'float', value: 6 },
          ForceExpandWidth: { $type: 'bool', value: true },
          ForceExpandHeight: { $type: 'bool', value: true },
        } as any,
      });
    }

    // Create 7 column buttons
    const colTriggerIds: string[] = [];
    for (let col = 0; col < COLS; col++) {
      await client.addSlot({ parentId: colBtnsId, name: `ColBtn_${col}` });
      const btnId = await getChildSlotId(client, colBtnsId, `ColBtn_${col}`);

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
          members: { Tint: { $type: 'colorX', value: { r: 0.3, g: 0.5, b: 0.7, a: 1 } } } as any,
        });
      }
      if (btnTrigger?.id) {
        await client.updateComponent({
          id: btnTrigger.id,
          members: {
            PressedTag: { $type: 'string', value: `Col_${col}` },
            Target: { $type: 'reference', targetId: mainId },
          } as any,
        });
        colTriggerIds.push(btnTrigger.id);
      }

      // Button label (arrow down)
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
            Content: { $type: 'string', value: 'v' },
            Size: { $type: 'float', value: 24 },
            Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
            HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
            VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
          } as any,
        });
      }
    }
    console.log('  Column buttons created');

    // ========== 9. Board (6x7 Grid) ==========
    await client.addSlot({ parentId: contentId, name: 'Board' });
    const boardId = await getChildSlotId(client, contentId, 'Board');

    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.UIX.VerticalLayout' });
    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });

    let boardData = await client.getSlot({ slotId: boardId, includeComponentData: true });
    const boardLayout = findComponent(boardData.data, 'LayoutElement');
    const boardVLayout = findComponent(boardData.data, 'VerticalLayout');
    const boardImage = findComponent(boardData.data, 'Image');

    if (boardLayout?.id) {
      await client.updateComponent({
        id: boardLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 390 } } as any,
      });
    }
    if (boardVLayout?.id) {
      await client.updateComponent({
        id: boardVLayout.id,
        members: {
          Spacing: { $type: 'float', value: 5 },
          PaddingTop: { $type: 'float', value: 8 },
          PaddingBottom: { $type: 'float', value: 8 },
          PaddingLeft: { $type: 'float', value: 8 },
          PaddingRight: { $type: 'float', value: 8 },
          ForceExpandWidth: { $type: 'bool', value: true },
          ForceExpandHeight: { $type: 'bool', value: true },
        } as any,
      });
    }
    if (boardImage?.id) {
      await client.updateComponent({
        id: boardImage.id,
        members: { Tint: { $type: 'colorX', value: { r: 0.15, g: 0.25, b: 0.5, a: 1 } } } as any,
      });
    }

    // Save cell piece Image IDs (indexed by cellIndex: row * COLS + col)
    const cellPieceImageIds: string[] = new Array(TOTAL_CELLS);

    // Create 6 rows x 7 columns (top row = row 5, bottom row = row 0)
    // Display from top to bottom, so iterate in reverse order
    for (let displayRow = 0; displayRow < ROWS; displayRow++) {
      const row = ROWS - 1 - displayRow; // row 5 at top, row 0 at bottom

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
            Spacing: { $type: 'float', value: 5 },
            ForceExpandWidth: { $type: 'bool', value: true },
            ForceExpandHeight: { $type: 'bool', value: true },
          } as any,
        });
      }

      for (let col = 0; col < COLS; col++) {
        const idx = cellIndex(row, col);
        const cellName = `Cell_${row}_${col}`;

        await client.addSlot({ parentId: rowId, name: cellName });
        const cellId = await getChildSlotId(client, rowId, cellName);

        await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
        await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
        await client.addComponent({ containerSlotId: cellId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });

        let cellData = await client.getSlot({ slotId: cellId, includeComponentData: true });
        const cellLayout = findComponent(cellData.data, 'LayoutElement');
        const cellImage = findComponent(cellData.data, 'Image');

        if (cellLayout?.id) {
          await client.updateComponent({
            id: cellLayout.id,
            members: { FlexibleWidth: { $type: 'float', value: 1 }, FlexibleHeight: { $type: 'float', value: 1 } } as any,
          });
        }
        if (cellImage?.id) {
          await client.updateComponent({
            id: cellImage.id,
            members: { Tint: { $type: 'colorX', value: { r: 0.9, g: 0.9, b: 0.95, a: 1 } } } as any,
          });
        }

        // Cell piece (circular Image for the game piece)
        await client.addSlot({ parentId: cellId, name: 'Piece' });
        const pieceSlotId = await getChildSlotId(client, cellId, 'Piece');

        await client.addComponent({ containerSlotId: pieceSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
        await client.addComponent({ containerSlotId: pieceSlotId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });

        let pieceData = await client.getSlot({ slotId: pieceSlotId, includeComponentData: true });
        const pieceRect = findComponent(pieceData.data, 'RectTransform');
        const pieceImage = findComponent(pieceData.data, 'Image');

        if (pieceRect?.id) {
          // Inset the piece slightly to create a circular appearance within the cell
          await client.updateComponent({
            id: pieceRect.id,
            members: {
              AnchorMin: { $type: 'float2', value: { x: 0, y: 0 } },
              AnchorMax: { $type: 'float2', value: { x: 1, y: 1 } },
              OffsetMin: { $type: 'float2', value: { x: 4, y: 4 } },
              OffsetMax: { $type: 'float2', value: { x: -4, y: -4 } },
            } as any,
          });
        }
        if (pieceImage?.id) {
          // Start with transparent (no piece)
          await client.updateComponent({
            id: pieceImage.id,
            members: {
              Tint: { $type: 'colorX', value: TRANSPARENT_COLOR },
              PreserveAspect: { $type: 'bool', value: true },
            } as any,
          });
          cellPieceImageIds[idx] = pieceImage.id;
        }
      }
      console.log(`  Row ${row} created`);
    }
    console.log('  Board created (6x7)');

    // ========== 10. ResetButton ==========
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
        members: { PreferredHeight: { $type: 'float', value: 40 } } as any,
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
          Target: { $type: 'reference', targetId: mainId },
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
          Content: { $type: 'string', value: 'Reset Game' },
          Size: { $type: 'float', value: 20 },
          Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
          HorizontalAlign: { $type: 'enum', value: 'Center', enumType: 'TextHorizontalAlignment' },
          VerticalAlign: { $type: 'enum', value: 'Middle', enumType: 'TextVerticalAlignment' },
        } as any,
      });
    }
    console.log('  ResetButton created');

    // ========== 11. Drive cell piece color with ValueDriver<colorX> ==========
    for (let i = 0; i < TOTAL_CELLS && i < cellColorFields.length; i++) {
      const colorField = cellColorFields[i];
      const pieceImageId = cellPieceImageIds[i];
      if (!colorField?.id || !pieceImageId) continue;

      await client.addComponent({
        containerSlotId: gameStateId,
        componentType: '[FrooxEngine]FrooxEngine.ValueDriver<colorX>',
      });

      gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
      const drives = findComponents(gameStateData.data, 'ValueDriver<colorX>');
      const drive = drives[drives.length - 1];

      if (drive?.id) {
        const pieceDetails = await client.getComponent(pieceImageId);
        const tintFieldId = pieceDetails.data?.members?.Tint?.id;

        const colorFieldDetails = await client.getComponent(colorField.id);
        const colorValueId = colorFieldDetails.data?.members?.Value?.id;

        const driveDetails = await client.getComponent(drive.id);
        const driveTargetId = driveDetails.data?.members?.DriveTarget?.id;

        await client.updateComponent({
          id: drive.id,
          members: {
            ValueSource: { $type: 'reference', targetId: colorValueId },
            DriveTarget: { $type: 'reference', id: driveTargetId, targetId: tintFieldId },
          } as any,
        });
      }
    }
    console.log('  Cell piece color drives connected');

    // ========== 12. Drive TurnDisplay (BooleanValueDriver) ==========
    await client.addComponent({
      containerSlotId: gameStateId,
      componentType: '[FrooxEngine]FrooxEngine.BooleanValueDriver<string>',
    });

    gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
    const turnDriver = findComponent(gameStateData.data, 'BooleanValueDriver');

    if (turnDriver?.id && turnText?.id && isRedTurnField?.id) {
      const turnTextDetails = await client.getComponent(turnText.id);
      const turnContentId = turnTextDetails.data?.members?.Content?.id;

      const turnDriverDetails = await client.getComponent(turnDriver.id);
      const targetFieldId = turnDriverDetails.data?.members?.TargetField?.id;

      await client.updateComponent({
        id: turnDriver.id,
        members: {
          TrueValue: { $type: 'string', value: "Red's Turn" },
          FalseValue: { $type: 'string', value: "Yellow's Turn" },
        } as any,
      });

      await client.updateComponent({
        id: turnDriver.id,
        members: {
          TargetField: { $type: 'reference', id: targetFieldId, targetId: turnContentId },
        } as any,
      });

      // Add ValueDriver<bool> to drive State from isRedTurn
      await client.addComponent({
        containerSlotId: gameStateId,
        componentType: '[FrooxEngine]FrooxEngine.ValueDriver<bool>',
      });

      gameStateData = await client.getSlot({ slotId: gameStateId, includeComponentData: true });
      const stateDrives = findComponents(gameStateData.data, 'ValueDriver<bool>');
      const stateDrive = stateDrives[stateDrives.length - 1];

      if (stateDrive?.id) {
        const isRedTurnDetails = await client.getComponent(isRedTurnField.id);
        const isRedTurnValueId = isRedTurnDetails.data?.members?.Value?.id;

        const turnDriverRefresh = await client.getComponent(turnDriver.id);
        const stateFieldId = turnDriverRefresh.data?.members?.State?.id;

        const stateDriveDetails = await client.getComponent(stateDrive.id);
        const driveTargetId = stateDriveDetails.data?.members?.DriveTarget?.id;

        await client.updateComponent({
          id: stateDrive.id,
          members: {
            ValueSource: { $type: 'reference', targetId: isRedTurnValueId },
            DriveTarget: { $type: 'reference', id: driveTargetId, targetId: stateFieldId },
          } as any,
        });
      }
    }
    console.log('  TurnDisplay driver connected');

    // Drive ResultDisplay
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
    console.log('  ResultDisplay driver connected');

    // ========== 13. ProtoFlux (game logic) ==========
    // Note: Due to complexity, we create simplified column-based logic
    // Each column has logic to find lowest empty cell and place piece
    await client.addSlot({ parentId: mainId, name: 'Flux' });
    const fluxId = await getChildSlotId(client, mainId, 'Flux');

    // ProtoFlux for each column (7 columns)
    for (let col = 0; col < COLS; col++) {
      console.log(`  Creating ProtoFlux for column ${col}...`);

      // Create column logic parent slot
      await client.addSlot({
        parentId: fluxId,
        name: `Col_${col}`,
        position: { x: col * 1.5 - 4.5, y: 0, z: 0 },
      });
      const colLogicId = await getChildSlotId(client, fluxId, `Col_${col}`);

      // For each column, we need to check 6 rows (bottom to top) to find first empty cell
      // Create slots for: Receiver, TagInput, GameOverSource, NotGameOver
      // Then for each row: CellSource, IfEmpty, Write, TurnSource, TurnWrite, etc.

      const nodeNames = ['Receiver', 'TagInput', 'GameOverSource', 'NotGameOver', 'CheckWinTrigger', 'CheckWinTag', 'TargetSlot'];
      for (const name of nodeNames) {
        await client.addSlot({ parentId: colLogicId, name });
      }

      // For each row in this column (rows 0-5, check from bottom)
      for (let row = 0; row < ROWS; row++) {
        const idx = cellIndex(row, col);
        const rowNodeNames = [
          `R${row}_CellSource`, `R${row}_Equals`, `R${row}_If`,
          `R${row}_Write`, `R${row}_Conditional`, `R${row}_RedInput`, `R${row}_YellowInput`,
          `R${row}_TurnSource`, `R${row}_TurnWrite`, `R${row}_Not`,
          // Color nodes
          `R${row}_ColorSource`, `R${row}_ColorConditional`, `R${row}_ColorWrite`,
          `R${row}_RedColorInput`, `R${row}_YellowColorInput`
        ];
        nodeNames.push(...rowNodeNames);
        for (const name of rowNodeNames) {
          await client.addSlot({ parentId: colLogicId, name });
        }
      }

      const colLogicData = await client.getSlot({ slotId: colLogicId, depth: 1 });
      const getNodeSlotId = (name: string) => colLogicData.data?.children?.find((c: any) => c.name?.value === name)?.id;

      // Add basic components
      const receiverSlotId = getNodeSlotId('Receiver');
      const tagInputSlotId = getNodeSlotId('TagInput');
      const gameOverSourceSlotId = getNodeSlotId('GameOverSource');
      const notGameOverSlotId = getNodeSlotId('NotGameOver');
      const checkWinTriggerSlotId = getNodeSlotId('CheckWinTrigger');
      const checkWinTagSlotId = getNodeSlotId('CheckWinTag');
      const targetSlotSlotId = getNodeSlotId('TargetSlot');

      await client.addComponent({ containerSlotId: receiverSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver' });
      await client.addComponent({ containerSlotId: tagInputSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>' });
      await client.addComponent({ containerSlotId: gameOverSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
      await client.addComponent({ containerSlotId: notGameOverSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.NOT_Bool' });
      await client.addComponent({ containerSlotId: checkWinTriggerSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseTrigger' });
      await client.addComponent({ containerSlotId: checkWinTagSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
      await client.addComponent({ containerSlotId: targetSlotSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.Slot>' });

      // Get components
      const getComp = async (slotId: string, typeIncludes: string) => {
        const data = await client.getSlot({ slotId, includeComponentData: true });
        return findComponent(data.data, typeIncludes);
      };

      const receiverComp = await getComp(receiverSlotId, 'DynamicImpulseReceiver');
      const tagInputComp = await getComp(tagInputSlotId, 'GlobalValue');
      const gameOverSourceComp = await getComp(gameOverSourceSlotId, 'ValueSource');
      const notGameOverComp = await getComp(notGameOverSlotId, 'NOT_Bool');
      const checkWinTriggerComp = await getComp(checkWinTriggerSlotId, 'DynamicImpulseTrigger');
      const checkWinTagComp = await getComp(checkWinTagSlotId, 'ValueObjectInput');
      const targetSlotComp = await getComp(targetSlotSlotId, 'RefObjectInput');

      // Tag setup
      if (tagInputComp?.id) {
        await client.updateComponent({ id: tagInputComp.id, members: { Value: { $type: 'string', value: `Col_${col}` } } as any });
      }
      if (receiverComp?.id && tagInputComp?.id) {
        await client.updateComponent({
          id: receiverComp.id,
          members: { Tag: { $type: 'reference', targetId: tagInputComp.id } } as any,
        });
      }

      // GameOverSource setup
      if (gameOverSourceComp?.id && isGameOverField?.id) {
        await client.addComponent({
          containerSlotId: gameOverSourceSlotId,
          componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>',
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        const slotData = await client.getSlot({ slotId: gameOverSourceSlotId, includeComponentData: true });
        const globalRefComp = findComponent(slotData.data, 'GlobalReference');
        const fieldDetails = await client.getComponent(isGameOverField.id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (globalRefComp?.id && valueId) {
          await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
          await client.updateComponent({ id: gameOverSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
        }
      }

      // NotGameOver
      if (notGameOverComp?.id && gameOverSourceComp?.id) {
        await client.updateComponent({
          id: notGameOverComp.id,
          members: { A: { $type: 'reference', targetId: gameOverSourceComp.id } } as any,
        });
      }

      // CheckWinTag and TargetSlot setup
      if (checkWinTagComp?.id) {
        await client.updateComponent({ id: checkWinTagComp.id, members: { Value: { $type: 'string', value: 'CheckWin' } } as any });
      }
      if (targetSlotComp?.id) {
        await client.updateComponent({ id: targetSlotComp.id, members: { Target: { $type: 'reference', targetId: mainId } } as any });
      }
      if (checkWinTriggerComp?.id && checkWinTagComp?.id && targetSlotComp?.id) {
        await client.updateComponent({
          id: checkWinTriggerComp.id,
          members: {
            Tag: { $type: 'reference', targetId: checkWinTagComp.id },
            TargetHierarchy: { $type: 'reference', targetId: targetSlotComp.id },
          } as any,
        });
      }

      // Store row components for chaining
      const rowComps: any[] = [];

      // Setup each row's components
      for (let row = 0; row < ROWS; row++) {
        const idx = cellIndex(row, col);
        const cellField = cellFields[idx];
        const cellColorField = cellColorFields[idx];

        const cellSourceSlotId = getNodeSlotId(`R${row}_CellSource`);
        const equalsSlotId = getNodeSlotId(`R${row}_Equals`);
        const ifSlotId = getNodeSlotId(`R${row}_If`);
        const writeSlotId = getNodeSlotId(`R${row}_Write`);
        const conditionalSlotId = getNodeSlotId(`R${row}_Conditional`);
        const redInputSlotId = getNodeSlotId(`R${row}_RedInput`);
        const yellowInputSlotId = getNodeSlotId(`R${row}_YellowInput`);
        const turnSourceSlotId = getNodeSlotId(`R${row}_TurnSource`);
        const turnWriteSlotId = getNodeSlotId(`R${row}_TurnWrite`);
        const notSlotId = getNodeSlotId(`R${row}_Not`);
        // Color nodes
        const colorSourceSlotId = getNodeSlotId(`R${row}_ColorSource`);
        const colorConditionalSlotId = getNodeSlotId(`R${row}_ColorConditional`);
        const colorWriteSlotId = getNodeSlotId(`R${row}_ColorWrite`);
        const redColorInputSlotId = getNodeSlotId(`R${row}_RedColorInput`);
        const yellowColorInputSlotId = getNodeSlotId(`R${row}_YellowColorInput`);

        // Add components
        await client.addComponent({ containerSlotId: cellSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
        await client.addComponent({ containerSlotId: equalsSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectEquals<string>' });
        await client.addComponent({ containerSlotId: ifSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.If' });
        await client.addComponent({ containerSlotId: writeSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });
        await client.addComponent({ containerSlotId: conditionalSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectConditional<string>' });
        await client.addComponent({ containerSlotId: redInputSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
        await client.addComponent({ containerSlotId: yellowInputSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
        await client.addComponent({ containerSlotId: turnSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
        await client.addComponent({ containerSlotId: turnWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>' });
        await client.addComponent({ containerSlotId: notSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.NOT_Bool' });
        // Color components
        await client.addComponent({ containerSlotId: colorSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<colorX>' });
        await client.addComponent({ containerSlotId: colorConditionalSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueConditional<colorX>' });
        await client.addComponent({ containerSlotId: colorWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,colorX>' });
        await client.addComponent({ containerSlotId: redColorInputSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<colorX>' });
        await client.addComponent({ containerSlotId: yellowColorInputSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<colorX>' });

        await new Promise(resolve => setTimeout(resolve, 30));

        const cellSourceComp = await getComp(cellSourceSlotId, 'ObjectValueSource');
        const equalsComp = await getComp(equalsSlotId, 'ObjectEquals');
        const ifComp = await getComp(ifSlotId, 'If');
        const writeComp = await getComp(writeSlotId, 'ObjectWrite');
        const conditionalComp = await getComp(conditionalSlotId, 'ObjectConditional');
        const redInputComp = await getComp(redInputSlotId, 'ValueObjectInput');
        const yellowInputComp = await getComp(yellowInputSlotId, 'ValueObjectInput');
        const turnSourceComp = await getComp(turnSourceSlotId, 'ValueSource');
        const turnWriteComp = await getComp(turnWriteSlotId, 'ValueWrite');
        const notComp = await getComp(notSlotId, 'NOT_Bool');
        // Color components
        const colorSourceComp = await getComp(colorSourceSlotId, 'ValueSource');
        const colorConditionalComp = await getComp(colorConditionalSlotId, 'ValueConditional');
        const colorWriteComp = await getComp(colorWriteSlotId, 'ValueWrite');
        const redColorInputComp = await getComp(redColorInputSlotId, 'ValueInput');
        const yellowColorInputComp = await getComp(yellowColorInputSlotId, 'ValueInput');

        // Set Red/Yellow values
        if (redInputComp?.id) {
          await client.updateComponent({ id: redInputComp.id, members: { Value: { $type: 'string', value: 'R' } } as any });
        }
        if (yellowInputComp?.id) {
          await client.updateComponent({ id: yellowInputComp.id, members: { Value: { $type: 'string', value: 'Y' } } as any });
        }
        // Set color values
        if (redColorInputComp?.id) {
          await client.updateComponent({ id: redColorInputComp.id, members: { Value: { $type: 'colorX', value: RED_COLOR } } as any });
        }
        if (yellowColorInputComp?.id) {
          await client.updateComponent({ id: yellowColorInputComp.id, members: { Value: { $type: 'colorX', value: YELLOW_COLOR } } as any });
        }

        // CellSource setup with GlobalReference
        if (cellSourceComp?.id && cellField?.id) {
          await client.addComponent({
            containerSlotId: cellSourceSlotId,
            componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>',
          });
          await new Promise(resolve => setTimeout(resolve, 30));
          const slotData = await client.getSlot({ slotId: cellSourceSlotId, includeComponentData: true });
          const globalRefComp = findComponent(slotData.data, 'GlobalReference');
          const fieldDetails = await client.getComponent(cellField.id);
          const valueId = fieldDetails.data?.members?.Value?.id;
          if (globalRefComp?.id && valueId) {
            await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
            await client.updateComponent({ id: cellSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
          }
        }

        // TurnSource setup with GlobalReference
        if (turnSourceComp?.id && isRedTurnField?.id) {
          await client.addComponent({
            containerSlotId: turnSourceSlotId,
            componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>',
          });
          await new Promise(resolve => setTimeout(resolve, 30));
          const slotData = await client.getSlot({ slotId: turnSourceSlotId, includeComponentData: true });
          const globalRefComp = findComponent(slotData.data, 'GlobalReference');
          const fieldDetails = await client.getComponent(isRedTurnField.id);
          const valueId = fieldDetails.data?.members?.Value?.id;
          if (globalRefComp?.id && valueId) {
            await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
            await client.updateComponent({ id: turnSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
          }
        }

        // ColorSource setup with GlobalReference
        if (colorSourceComp?.id && cellColorField?.id) {
          await client.addComponent({
            containerSlotId: colorSourceSlotId,
            componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<colorX>>',
          });
          await new Promise(resolve => setTimeout(resolve, 30));
          const slotData = await client.getSlot({ slotId: colorSourceSlotId, includeComponentData: true });
          const globalRefComp = findComponent(slotData.data, 'GlobalReference');
          const fieldDetails = await client.getComponent(cellColorField.id);
          const valueId = fieldDetails.data?.members?.Value?.id;
          if (globalRefComp?.id && valueId) {
            await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
            await client.updateComponent({ id: colorSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
          }
        }

        // Equals: cell == null (B unconnected)
        if (equalsComp?.id && cellSourceComp?.id) {
          await client.updateComponent({
            id: equalsComp.id,
            members: { A: { $type: 'reference', targetId: cellSourceComp.id } } as any,
          });
        }

        // Conditional: isRedTurn ? "R" : "Y"
        if (conditionalComp?.id && turnSourceComp?.id && redInputComp?.id && yellowInputComp?.id) {
          await client.updateComponent({
            id: conditionalComp.id,
            members: {
              Condition: { $type: 'reference', targetId: turnSourceComp.id },
              OnTrue: { $type: 'reference', targetId: redInputComp.id },
              OnFalse: { $type: 'reference', targetId: yellowInputComp.id },
            } as any,
          });
        }

        // ColorConditional: isRedTurn ? RED_COLOR : YELLOW_COLOR
        if (colorConditionalComp?.id && turnSourceComp?.id && redColorInputComp?.id && yellowColorInputComp?.id) {
          await client.updateComponent({
            id: colorConditionalComp.id,
            members: {
              Condition: { $type: 'reference', targetId: turnSourceComp.id },
              OnTrue: { $type: 'reference', targetId: redColorInputComp.id },
              OnFalse: { $type: 'reference', targetId: yellowColorInputComp.id },
            } as any,
          });
        }

        // Write: Variable = cellSource, Value = conditional
        if (writeComp?.id && cellSourceComp?.id && conditionalComp?.id) {
          await client.updateComponent({
            id: writeComp.id,
            members: {
              Variable: { $type: 'reference', targetId: cellSourceComp.id },
              Value: { $type: 'reference', targetId: conditionalComp.id },
            } as any,
          });
        }

        // ColorWrite: Variable = colorSource, Value = colorConditional
        if (colorWriteComp?.id && colorSourceComp?.id && colorConditionalComp?.id) {
          await client.updateComponent({
            id: colorWriteComp.id,
            members: {
              Variable: { $type: 'reference', targetId: colorSourceComp.id },
              Value: { $type: 'reference', targetId: colorConditionalComp.id },
            } as any,
          });
        }

        // Not: toggle turn
        if (notComp?.id && turnSourceComp?.id) {
          await client.updateComponent({
            id: notComp.id,
            members: { A: { $type: 'reference', targetId: turnSourceComp.id } } as any,
          });
        }

        // TurnWrite: Variable = turnSource, Value = not
        if (turnWriteComp?.id && turnSourceComp?.id && notComp?.id) {
          await client.updateComponent({
            id: turnWriteComp.id,
            members: {
              Variable: { $type: 'reference', targetId: turnSourceComp.id },
              Value: { $type: 'reference', targetId: notComp.id },
            } as any,
          });
        }

        rowComps.push({
          ifComp, equalsComp, writeComp, colorWriteComp, turnWriteComp, notGameOverComp
        });
      }

      // Chain the logic: Receiver -> Row0.If -> (if empty) Write -> TurnWrite -> CheckWin
      //                                      -> (if not empty) Row1.If -> ...
      // First, connect Receiver to Row0.If with NotGameOver check
      // We'll use AND to combine: cellEmpty AND notGameOver

      // For simplicity, connect: Receiver.OnTriggered -> Row0.If
      // Row0.If.Condition = Row0.Equals (cell empty)
      // Row0.If.OnTrue -> Row0.Write -> Row0.TurnWrite -> CheckWin
      // Row0.If.OnFalse -> Row1.If
      // ... and so on

      // However, we also need to check game not over. Let's add AND nodes.
      for (let row = 0; row < ROWS; row++) {
        const { ifComp, equalsComp, writeComp, colorWriteComp, turnWriteComp } = rowComps[row];

        // Add AND node for this row
        await client.addSlot({ parentId: colLogicId, name: `R${row}_And` });
        const andSlotId = await getChildSlotId(client, colLogicId, `R${row}_And`);
        await client.addComponent({ containerSlotId: andSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
        await new Promise(resolve => setTimeout(resolve, 20));
        const andComp = await getComp(andSlotId, 'AND_Bool');

        // AND: equalsComp (empty) AND notGameOverComp
        if (andComp?.id && equalsComp?.id && notGameOverComp?.id) {
          await client.updateComponent({
            id: andComp.id,
            members: {
              A: { $type: 'reference', targetId: equalsComp.id },
              B: { $type: 'reference', targetId: notGameOverComp.id },
            } as any,
          });
        }

        // If.Condition = AND result
        if (ifComp?.id && andComp?.id) {
          await client.updateComponent({
            id: ifComp.id,
            members: { Condition: { $type: 'reference', targetId: andComp.id } } as any,
          });
        }

        // If.OnTrue -> Write
        if (ifComp?.id && writeComp?.id) {
          const ifDetails = await client.getComponent(ifComp.id);
          const onTrueId = ifDetails.data?.members?.OnTrue?.id;
          await client.updateComponent({
            id: ifComp.id,
            members: { OnTrue: { $type: 'reference', id: onTrueId, targetId: writeComp.id } } as any,
          });
        }

        // Write.OnWritten -> ColorWrite
        if (writeComp?.id && colorWriteComp?.id) {
          const writeDetails = await client.getComponent(writeComp.id);
          const onWrittenId = writeDetails.data?.members?.OnWritten?.id;
          await client.updateComponent({
            id: writeComp.id,
            members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: colorWriteComp.id } } as any,
          });
        }

        // ColorWrite.OnWritten -> TurnWrite
        if (colorWriteComp?.id && turnWriteComp?.id) {
          const colorWriteDetails = await client.getComponent(colorWriteComp.id);
          const onWrittenId = colorWriteDetails.data?.members?.OnWritten?.id;
          await client.updateComponent({
            id: colorWriteComp.id,
            members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: turnWriteComp.id } } as any,
          });
        }

        // TurnWrite.OnWritten -> CheckWinTrigger
        if (turnWriteComp?.id && checkWinTriggerComp?.id) {
          const turnWriteDetails = await client.getComponent(turnWriteComp.id);
          const onWrittenId = turnWriteDetails.data?.members?.OnWritten?.id;
          await client.updateComponent({
            id: turnWriteComp.id,
            members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: checkWinTriggerComp.id } } as any,
          });
        }

        // If.OnFalse -> next row's If (or nothing if last row)
        if (row < ROWS - 1) {
          const nextIfComp = rowComps[row + 1].ifComp;
          if (ifComp?.id && nextIfComp?.id) {
            const ifDetails = await client.getComponent(ifComp.id);
            const onFalseId = ifDetails.data?.members?.OnFalse?.id;
            await client.updateComponent({
              id: ifComp.id,
              members: { OnFalse: { $type: 'reference', id: onFalseId, targetId: nextIfComp.id } } as any,
            });
          }
        }
      }

      // Connect Receiver to first row's If
      const firstIfComp = rowComps[0].ifComp;
      if (receiverComp?.id && firstIfComp?.id) {
        const receiverDetails = await client.getComponent(receiverComp.id);
        const onTriggeredId = receiverDetails.data?.members?.OnTriggered?.id;
        await client.updateComponent({
          id: receiverComp.id,
          members: { OnTriggered: { $type: 'reference', id: onTriggeredId, targetId: firstIfComp.id } } as any,
        });
      }

      console.log(`    Column ${col} logic created`);
    }

    // ========== 14. Win Check Logic (simplified) ==========
    console.log('  Creating win check logic...');
    await client.addSlot({ parentId: fluxId, name: 'WinCheck', position: { x: 6, y: 0, z: 0 } });
    const winCheckId = await getChildSlotId(client, fluxId, 'WinCheck');

    // Due to complexity (many win lines in Connect 4), we'll create a simplified version
    // that checks a subset of winning conditions

    // Win lines for Connect 4:
    // - Horizontal: 4 consecutive in each row (24 lines: 4 per row * 6 rows)
    // - Vertical: 4 consecutive in each column (21 lines: 3 per column * 7 columns)
    // - Diagonal: 4 consecutive diagonally (24 lines total)
    // Total: 69 possible winning lines

    // For simplicity, we'll create basic structure with win check
    const winCheckNodes = ['Receiver', 'TagInput', 'IfWinner', 'IfDraw',
      'GameOverWrite', 'GameOverSource', 'ResultWrite', 'ResultSource',
      'TrueInput', 'RedWinText', 'YellowWinText', 'DrawText', 'WinnerConditional', 'WinnerTurnSource'];

    for (const name of winCheckNodes) {
      await client.addSlot({ parentId: winCheckId, name });
    }

    const winCheckData = await client.getSlot({ slotId: winCheckId, depth: 1 });
    const getWinSlotId = (name: string) => winCheckData.data?.children?.find((c: any) => c.name?.value === name)?.id;

    // Add components
    await client.addComponent({ containerSlotId: getWinSlotId('Receiver'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver' });
    await client.addComponent({ containerSlotId: getWinSlotId('TagInput'), componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>' });
    await client.addComponent({ containerSlotId: getWinSlotId('IfWinner'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.If' });
    await client.addComponent({ containerSlotId: getWinSlotId('IfDraw'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.If' });
    await client.addComponent({ containerSlotId: getWinSlotId('GameOverWrite'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>' });
    await client.addComponent({ containerSlotId: getWinSlotId('GameOverSource'), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
    await client.addComponent({ containerSlotId: getWinSlotId('ResultWrite'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });
    await client.addComponent({ containerSlotId: getWinSlotId('ResultSource'), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
    await client.addComponent({ containerSlotId: getWinSlotId('TrueInput'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<bool>' });
    await client.addComponent({ containerSlotId: getWinSlotId('RedWinText'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
    await client.addComponent({ containerSlotId: getWinSlotId('YellowWinText'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
    await client.addComponent({ containerSlotId: getWinSlotId('DrawText'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<string>' });
    await client.addComponent({ containerSlotId: getWinSlotId('WinnerConditional'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectConditional<string>' });
    await client.addComponent({ containerSlotId: getWinSlotId('WinnerTurnSource'), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });

    await new Promise(resolve => setTimeout(resolve, 100));

    const getWinComp = async (name: string, typeIncludes: string) => {
      const slotId = getWinSlotId(name);
      if (!slotId) return null;
      const data = await client.getSlot({ slotId, includeComponentData: true });
      return findComponent(data.data, typeIncludes);
    };

    const receiverWinComp = await getWinComp('Receiver', 'DynamicImpulseReceiver');
    const tagInputWinComp = await getWinComp('TagInput', 'GlobalValue');
    const ifWinnerComp = await getWinComp('IfWinner', 'If');
    const ifDrawComp = await getWinComp('IfDraw', 'If');
    const gameOverWriteComp = await getWinComp('GameOverWrite', 'ValueWrite');
    const gameOverSourceComp2 = await getWinComp('GameOverSource', 'ValueSource');
    const resultWriteComp = await getWinComp('ResultWrite', 'ObjectWrite');
    const resultSourceComp = await getWinComp('ResultSource', 'ObjectValueSource');
    const trueInputWinComp = await getWinComp('TrueInput', 'ValueInput');
    const redWinTextComp = await getWinComp('RedWinText', 'ValueObjectInput');
    const yellowWinTextComp = await getWinComp('YellowWinText', 'ValueObjectInput');
    const drawTextComp = await getWinComp('DrawText', 'ValueObjectInput');
    const winnerConditionalComp = await getWinComp('WinnerConditional', 'ObjectConditional');
    const winnerTurnSourceComp = await getWinComp('WinnerTurnSource', 'ValueSource');

    // Set tag and values
    if (tagInputWinComp?.id) {
      await client.updateComponent({ id: tagInputWinComp.id, members: { Value: { $type: 'string', value: 'CheckWin' } } as any });
    }
    if (receiverWinComp?.id && tagInputWinComp?.id) {
      await client.updateComponent({ id: receiverWinComp.id, members: { Tag: { $type: 'reference', targetId: tagInputWinComp.id } } as any });
    }
    if (trueInputWinComp?.id) {
      await client.updateComponent({ id: trueInputWinComp.id, members: { Value: { $type: 'bool', value: true } } as any });
    }
    if (redWinTextComp?.id) {
      await client.updateComponent({ id: redWinTextComp.id, members: { Value: { $type: 'string', value: 'Red Wins!' } } as any });
    }
    if (yellowWinTextComp?.id) {
      await client.updateComponent({ id: yellowWinTextComp.id, members: { Value: { $type: 'string', value: 'Yellow Wins!' } } as any });
    }
    if (drawTextComp?.id) {
      await client.updateComponent({ id: drawTextComp.id, members: { Value: { $type: 'string', value: 'Draw!' } } as any });
    }

    // Setup GlobalReferences
    const gameOverSourceSlotId2 = getWinSlotId('GameOverSource');
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

    const resultSourceSlotId = getWinSlotId('ResultSource');
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

    const winnerTurnSourceSlotId = getWinSlotId('WinnerTurnSource');
    if (winnerTurnSourceComp?.id && isRedTurnField?.id) {
      await client.addComponent({
        containerSlotId: winnerTurnSourceSlotId,
        componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>',
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      const slotData = await client.getSlot({ slotId: winnerTurnSourceSlotId, includeComponentData: true });
      const globalRefComp = findComponent(slotData.data, 'GlobalReference');
      const fieldDetails = await client.getComponent(isRedTurnField.id);
      const valueId = fieldDetails.data?.members?.Value?.id;
      if (globalRefComp?.id && valueId) {
        await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
        await client.updateComponent({ id: winnerTurnSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
      }
    }

    // WinnerConditional: isRedTurn ? "Yellow Wins" : "Red Wins" (turn already switched)
    if (winnerConditionalComp?.id && winnerTurnSourceComp?.id && yellowWinTextComp?.id && redWinTextComp?.id) {
      await client.updateComponent({
        id: winnerConditionalComp.id,
        members: {
          Condition: { $type: 'reference', targetId: winnerTurnSourceComp.id },
          OnTrue: { $type: 'reference', targetId: yellowWinTextComp.id },
          OnFalse: { $type: 'reference', targetId: redWinTextComp.id },
        } as any,
      });
    }

    // Create win checking lines (simplified: just horizontal and vertical for demonstration)
    // Full implementation would need all 69 lines

    // We'll create a representative subset of win lines
    const winLines: number[][] = [];

    // Horizontal lines (4 per row, 6 rows = 24)
    for (let row = 0; row < ROWS; row++) {
      for (let startCol = 0; startCol <= COLS - 4; startCol++) {
        winLines.push([
          cellIndex(row, startCol),
          cellIndex(row, startCol + 1),
          cellIndex(row, startCol + 2),
          cellIndex(row, startCol + 3)
        ]);
      }
    }

    // Vertical lines (3 per column, 7 columns = 21)
    for (let col = 0; col < COLS; col++) {
      for (let startRow = 0; startRow <= ROWS - 4; startRow++) {
        winLines.push([
          cellIndex(startRow, col),
          cellIndex(startRow + 1, col),
          cellIndex(startRow + 2, col),
          cellIndex(startRow + 3, col)
        ]);
      }
    }

    // Diagonal (bottom-left to top-right)
    for (let row = 0; row <= ROWS - 4; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        winLines.push([
          cellIndex(row, col),
          cellIndex(row + 1, col + 1),
          cellIndex(row + 2, col + 2),
          cellIndex(row + 3, col + 3)
        ]);
      }
    }

    // Diagonal (top-left to bottom-right)
    for (let row = 3; row < ROWS; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        winLines.push([
          cellIndex(row, col),
          cellIndex(row - 1, col + 1),
          cellIndex(row - 2, col + 2),
          cellIndex(row - 3, col + 3)
        ]);
      }
    }

    console.log(`  Creating ${winLines.length} win line checks...`);

    // Create slots for win line checking
    for (let l = 0; l < winLines.length; l++) {
      await client.addSlot({ parentId: winCheckId, name: `L${l}_CellA` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_CellB` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_CellC` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_CellD` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_EqAB` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_EqBC` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_EqCD` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_NotNull` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_And1` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_And2` });
      await client.addSlot({ parentId: winCheckId, name: `L${l}_And3` });
    }

    // Create OR chain for all lines
    const orChainSize = Math.ceil(Math.log2(winLines.length)) + 1;
    for (let i = 0; i < winLines.length; i++) {
      await client.addSlot({ parentId: winCheckId, name: `Or_${i}` });
    }

    // Refresh win check data
    const winCheckData2 = await client.getSlot({ slotId: winCheckId, depth: 1 });
    const getWinSlotId2 = (name: string) => winCheckData2.data?.children?.find((c: any) => c.name?.value === name)?.id;

    // Add components and wire up win lines
    const lineResults: any[] = [];
    for (let l = 0; l < winLines.length; l++) {
      const [a, b, c, d] = winLines[l];

      // Add components
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_CellA`), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_CellB`), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_CellC`), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_CellD`), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_EqAB`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectEquals<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_EqBC`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectEquals<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_EqCD`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectEquals<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_NotNull`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectNotEquals<string>' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_And1`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_And2`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
      await client.addComponent({ containerSlotId: getWinSlotId2(`L${l}_And3`), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });

      await new Promise(resolve => setTimeout(resolve, 20));

      // Get components
      const getWinComp2 = async (name: string, typeIncludes: string) => {
        const slotId = getWinSlotId2(name);
        if (!slotId) return null;
        const data = await client.getSlot({ slotId, includeComponentData: true });
        return findComponent(data.data, typeIncludes);
      };

      // Setup cell sources with GlobalReferences
      for (const [suffix, cellIdx] of [['CellA', a], ['CellB', b], ['CellC', c], ['CellD', d]] as const) {
        const cellSourceComp = await getWinComp2(`L${l}_${suffix}`, 'ObjectValueSource');
        const cellField = cellFields[cellIdx];
        if (cellSourceComp?.id && cellField?.id) {
          const slotId = getWinSlotId2(`L${l}_${suffix}`);
          await client.addComponent({
            containerSlotId: slotId,
            componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>',
          });
          await new Promise(resolve => setTimeout(resolve, 20));
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

      const cellAComp = await getWinComp2(`L${l}_CellA`, 'ObjectValueSource');
      const cellBComp = await getWinComp2(`L${l}_CellB`, 'ObjectValueSource');
      const cellCComp = await getWinComp2(`L${l}_CellC`, 'ObjectValueSource');
      const cellDComp = await getWinComp2(`L${l}_CellD`, 'ObjectValueSource');
      const eqABComp = await getWinComp2(`L${l}_EqAB`, 'ObjectEquals');
      const eqBCComp = await getWinComp2(`L${l}_EqBC`, 'ObjectEquals');
      const eqCDComp = await getWinComp2(`L${l}_EqCD`, 'ObjectEquals');
      const notNullComp = await getWinComp2(`L${l}_NotNull`, 'ObjectNotEquals');
      const and1Comp = await getWinComp2(`L${l}_And1`, 'AND_Bool');
      const and2Comp = await getWinComp2(`L${l}_And2`, 'AND_Bool');
      const and3Comp = await getWinComp2(`L${l}_And3`, 'AND_Bool');

      // Wire up comparisons
      if (eqABComp?.id && cellAComp?.id && cellBComp?.id) {
        await client.updateComponent({
          id: eqABComp.id,
          members: { A: { $type: 'reference', targetId: cellAComp.id }, B: { $type: 'reference', targetId: cellBComp.id } } as any,
        });
      }
      if (eqBCComp?.id && cellBComp?.id && cellCComp?.id) {
        await client.updateComponent({
          id: eqBCComp.id,
          members: { A: { $type: 'reference', targetId: cellBComp.id }, B: { $type: 'reference', targetId: cellCComp.id } } as any,
        });
      }
      if (eqCDComp?.id && cellCComp?.id && cellDComp?.id) {
        await client.updateComponent({
          id: eqCDComp.id,
          members: { A: { $type: 'reference', targetId: cellCComp.id }, B: { $type: 'reference', targetId: cellDComp.id } } as any,
        });
      }
      if (notNullComp?.id && cellAComp?.id) {
        await client.updateComponent({
          id: notNullComp.id,
          members: { A: { $type: 'reference', targetId: cellAComp.id } } as any,
        });
      }

      // AND chain: (A==B && B==C && C==D && A!=null)
      if (and1Comp?.id && eqABComp?.id && eqBCComp?.id) {
        await client.updateComponent({
          id: and1Comp.id,
          members: { A: { $type: 'reference', targetId: eqABComp.id }, B: { $type: 'reference', targetId: eqBCComp.id } } as any,
        });
      }
      if (and2Comp?.id && and1Comp?.id && eqCDComp?.id) {
        await client.updateComponent({
          id: and2Comp.id,
          members: { A: { $type: 'reference', targetId: and1Comp.id }, B: { $type: 'reference', targetId: eqCDComp.id } } as any,
        });
      }
      if (and3Comp?.id && and2Comp?.id && notNullComp?.id) {
        await client.updateComponent({
          id: and3Comp.id,
          members: { A: { $type: 'reference', targetId: and2Comp.id }, B: { $type: 'reference', targetId: notNullComp.id } } as any,
        });
      }

      lineResults.push(and3Comp);

      if ((l + 1) % 10 === 0) {
        console.log(`    Win line ${l + 1}/${winLines.length} created`);
      }
    }

    // Create OR chain for all line results
    // Build binary tree of ORs
    let orInputs = lineResults;
    let orLevel = 0;
    while (orInputs.length > 1) {
      const newOrInputs: any[] = [];
      for (let i = 0; i < orInputs.length; i += 2) {
        await client.addSlot({ parentId: winCheckId, name: `OrL${orLevel}_${Math.floor(i/2)}` });
        const orSlotId = await getChildSlotId(client, winCheckId, `OrL${orLevel}_${Math.floor(i/2)}`);
        await client.addComponent({ containerSlotId: orSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.OR_Bool' });
        await new Promise(resolve => setTimeout(resolve, 10));

        const orSlotData = await client.getSlot({ slotId: orSlotId, includeComponentData: true });
        const orComp = findComponent(orSlotData.data, 'OR_Bool');

        if (orComp?.id) {
          const aComp = orInputs[i];
          const bComp = orInputs[i + 1] || orInputs[i]; // If odd number, duplicate last

          if (aComp?.id && bComp?.id) {
            await client.updateComponent({
              id: orComp.id,
              members: {
                A: { $type: 'reference', targetId: aComp.id },
                B: { $type: 'reference', targetId: bComp.id },
              } as any,
            });
          }
          newOrInputs.push(orComp);
        }
      }
      orInputs = newOrInputs;
      orLevel++;
    }

    const finalOrComp = orInputs[0];
    console.log('  Win line OR chain created');

    // Create draw check (all cells filled)
    const drawNotNullComps: any[] = [];
    for (let c = 0; c < TOTAL_CELLS; c++) {
      await client.addSlot({ parentId: winCheckId, name: `Draw_Cell${c}` });
      await client.addSlot({ parentId: winCheckId, name: `Draw_NotNull${c}` });
    }

    const winCheckData3 = await client.getSlot({ slotId: winCheckId, depth: 1 });
    const getWinSlotId3 = (name: string) => winCheckData3.data?.children?.find((c: any) => c.name?.value === name)?.id;

    for (let c = 0; c < TOTAL_CELLS; c++) {
      const cellSourceSlotId = getWinSlotId3(`Draw_Cell${c}`);
      const notNullSlotId = getWinSlotId3(`Draw_NotNull${c}`);

      await client.addComponent({ containerSlotId: cellSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: notNullSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectNotEquals<string>' });

      await new Promise(resolve => setTimeout(resolve, 10));

      let cellSourceData = await client.getSlot({ slotId: cellSourceSlotId, includeComponentData: true });
      const cellSourceComp = findComponent(cellSourceData.data, 'ObjectValueSource');
      const cellField = cellFields[c];

      if (cellSourceComp?.id && cellField?.id) {
        await client.addComponent({
          containerSlotId: cellSourceSlotId,
          componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>',
        });
        await new Promise(resolve => setTimeout(resolve, 10));
        cellSourceData = await client.getSlot({ slotId: cellSourceSlotId, includeComponentData: true });
        const globalRefComp = findComponent(cellSourceData.data, 'GlobalReference');
        const fieldDetails = await client.getComponent(cellField.id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (globalRefComp?.id && valueId) {
          await client.updateComponent({ id: globalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
          await client.updateComponent({ id: cellSourceComp.id, members: { Source: { $type: 'reference', targetId: globalRefComp.id } } as any });
        }
      }

      const notNullData = await client.getSlot({ slotId: notNullSlotId, includeComponentData: true });
      const notNullComp = findComponent(notNullData.data, 'ObjectNotEquals');

      if (notNullComp?.id && cellSourceComp?.id) {
        await client.updateComponent({
          id: notNullComp.id,
          members: { A: { $type: 'reference', targetId: cellSourceComp.id } } as any,
        });
      }

      drawNotNullComps.push(notNullComp);
    }

    // AND chain for all cells not null (draw check)
    let andInputs = drawNotNullComps;
    let andLevel = 0;
    while (andInputs.length > 1) {
      const newAndInputs: any[] = [];
      for (let i = 0; i < andInputs.length; i += 2) {
        await client.addSlot({ parentId: winCheckId, name: `DrawAndL${andLevel}_${Math.floor(i/2)}` });
        const andSlotId = await getChildSlotId(client, winCheckId, `DrawAndL${andLevel}_${Math.floor(i/2)}`);
        await client.addComponent({ containerSlotId: andSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });
        await new Promise(resolve => setTimeout(resolve, 10));

        const andSlotData = await client.getSlot({ slotId: andSlotId, includeComponentData: true });
        const andComp = findComponent(andSlotData.data, 'AND_Bool');

        if (andComp?.id) {
          const aComp = andInputs[i];
          const bComp = andInputs[i + 1] || andInputs[i];

          if (aComp?.id && bComp?.id) {
            await client.updateComponent({
              id: andComp.id,
              members: {
                A: { $type: 'reference', targetId: aComp.id },
                B: { $type: 'reference', targetId: bComp.id },
              } as any,
            });
          }
          newAndInputs.push(andComp);
        }
      }
      andInputs = newAndInputs;
      andLevel++;
    }

    const allFilledComp = andInputs[0];

    // Draw = allFilled AND NOT(winner)
    await client.addSlot({ parentId: winCheckId, name: 'Draw_NotWin' });
    await client.addSlot({ parentId: winCheckId, name: 'Draw_Final' });
    const drawNotWinSlotId = await getChildSlotId(client, winCheckId, 'Draw_NotWin');
    const drawFinalSlotId = await getChildSlotId(client, winCheckId, 'Draw_Final');

    await client.addComponent({ containerSlotId: drawNotWinSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.NOT_Bool' });
    await client.addComponent({ containerSlotId: drawFinalSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.AND_Bool' });

    await new Promise(resolve => setTimeout(resolve, 50));

    const drawNotWinData = await client.getSlot({ slotId: drawNotWinSlotId, includeComponentData: true });
    const drawNotWinComp = findComponent(drawNotWinData.data, 'NOT_Bool');
    const drawFinalData = await client.getSlot({ slotId: drawFinalSlotId, includeComponentData: true });
    const drawFinalComp = findComponent(drawFinalData.data, 'AND_Bool');

    if (drawNotWinComp?.id && finalOrComp?.id) {
      await client.updateComponent({
        id: drawNotWinComp.id,
        members: { A: { $type: 'reference', targetId: finalOrComp.id } } as any,
      });
    }
    if (drawFinalComp?.id && allFilledComp?.id && drawNotWinComp?.id) {
      await client.updateComponent({
        id: drawFinalComp.id,
        members: {
          A: { $type: 'reference', targetId: allFilledComp.id },
          B: { $type: 'reference', targetId: drawNotWinComp.id },
        } as any,
      });
    }

    // Connect execution flow
    // Receiver.OnTriggered -> IfWinner
    if (receiverWinComp?.id && ifWinnerComp?.id) {
      const details = await client.getComponent(receiverWinComp.id);
      const onTriggeredId = details.data?.members?.OnTriggered?.id;
      await client.updateComponent({
        id: receiverWinComp.id,
        members: { OnTriggered: { $type: 'reference', id: onTriggeredId, targetId: ifWinnerComp.id } } as any,
      });
    }

    // IfWinner.Condition <- finalOrComp
    if (ifWinnerComp?.id && finalOrComp?.id) {
      await client.updateComponent({
        id: ifWinnerComp.id,
        members: { Condition: { $type: 'reference', targetId: finalOrComp.id } } as any,
      });
    }

    // IfWinner.OnTrue -> GameOverWrite
    if (ifWinnerComp?.id && gameOverWriteComp?.id) {
      const details = await client.getComponent(ifWinnerComp.id);
      const onTrueId = details.data?.members?.OnTrue?.id;
      await client.updateComponent({
        id: ifWinnerComp.id,
        members: { OnTrue: { $type: 'reference', id: onTrueId, targetId: gameOverWriteComp.id } } as any,
      });
    }

    // IfWinner.OnFalse -> IfDraw
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

    // GameOverWrite.OnWritten -> ResultWrite
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

    // IfDraw.Condition <- drawFinalComp
    if (ifDrawComp?.id && drawFinalComp?.id) {
      await client.updateComponent({
        id: ifDrawComp.id,
        members: { Condition: { $type: 'reference', targetId: drawFinalComp.id } } as any,
      });
    }

    // IfDraw.OnTrue -> DrawGameOverWrite + DrawResultWrite
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

    if (ifDrawComp?.id && drawGameOverWriteComp?.id) {
      const details = await client.getComponent(ifDrawComp.id);
      const onTrueId = details.data?.members?.OnTrue?.id;
      await client.updateComponent({
        id: ifDrawComp.id,
        members: { OnTrue: { $type: 'reference', id: onTrueId, targetId: drawGameOverWriteComp.id } } as any,
      });
    }

    if (drawGameOverWriteComp?.id && gameOverSourceComp2?.id && trueInputWinComp?.id) {
      await client.updateComponent({
        id: drawGameOverWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: gameOverSourceComp2.id },
          Value: { $type: 'reference', targetId: trueInputWinComp.id },
        } as any,
      });
    }

    if (drawGameOverWriteComp?.id && drawResultWriteComp?.id) {
      const details = await client.getComponent(drawGameOverWriteComp.id);
      const onWrittenId = details.data?.members?.OnWritten?.id;
      await client.updateComponent({
        id: drawGameOverWriteComp.id,
        members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: drawResultWriteComp.id } } as any,
      });
    }

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

    // ========== 15. Reset Logic ==========
    console.log('  Creating reset logic...');
    await client.addSlot({ parentId: fluxId, name: 'Reset', position: { x: 8, y: 0, z: 0 } });
    const resetId = await getChildSlotId(client, fluxId, 'Reset');

    const resetNodeNames = ['Receiver', 'TagInput', 'TrueInput', 'FalseInput', 'TransparentInput'];
    for (let i = 0; i < TOTAL_CELLS; i++) {
      resetNodeNames.push(`CellSource_${i}`, `CellWrite_${i}`, `ColorSource_${i}`, `ColorWrite_${i}`);
    }
    resetNodeNames.push('TurnSource', 'TurnWrite', 'GameOverSource', 'GameOverWrite', 'ResultSource', 'ResultWrite');

    for (const name of resetNodeNames) {
      await client.addSlot({ parentId: resetId, name });
    }

    const resetSlotData = await client.getSlot({ slotId: resetId, depth: 1 });
    const getResetSlotId = (name: string) => resetSlotData.data?.children?.find((c: any) => c.name?.value === name)?.id;

    // Add basic components
    await client.addComponent({ containerSlotId: getResetSlotId('Receiver'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver' });
    await client.addComponent({ containerSlotId: getResetSlotId('TagInput'), componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalValue<string>' });
    await client.addComponent({ containerSlotId: getResetSlotId('TrueInput'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<bool>' });
    await client.addComponent({ containerSlotId: getResetSlotId('FalseInput'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<bool>' });
    await client.addComponent({ containerSlotId: getResetSlotId('TransparentInput'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueInput<colorX>' });
    await client.addComponent({ containerSlotId: getResetSlotId('TurnSource'), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
    await client.addComponent({ containerSlotId: getResetSlotId('TurnSource'), componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>' });
    await client.addComponent({ containerSlotId: getResetSlotId('TurnWrite'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>' });
    await client.addComponent({ containerSlotId: getResetSlotId('GameOverSource'), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<bool>' });
    await client.addComponent({ containerSlotId: getResetSlotId('GameOverSource'), componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<bool>>' });
    await client.addComponent({ containerSlotId: getResetSlotId('GameOverWrite'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,bool>' });
    await client.addComponent({ containerSlotId: getResetSlotId('ResultSource'), componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
    await client.addComponent({ containerSlotId: getResetSlotId('ResultSource'), componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>' });
    await client.addComponent({ containerSlotId: getResetSlotId('ResultWrite'), componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });

    // Add cell sources and writes (both string and color)
    const resetCellWriteComps: any[] = [];
    const resetColorWriteComps: any[] = [];
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const cellSourceSlotId = getResetSlotId(`CellSource_${i}`);
      const cellWriteSlotId = getResetSlotId(`CellWrite_${i}`);
      const colorSourceSlotId = getResetSlotId(`ColorSource_${i}`);
      const colorWriteSlotId = getResetSlotId(`ColorWrite_${i}`);

      // String cell components
      await client.addComponent({ containerSlotId: cellSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ObjectValueSource<string>' });
      await client.addComponent({ containerSlotId: cellSourceSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<string>>' });
      await client.addComponent({ containerSlotId: cellWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>' });
      // Color cell components
      await client.addComponent({ containerSlotId: colorSourceSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.FrooxEngine.ProtoFlux.CoreNodes.ValueSource<colorX>' });
      await client.addComponent({ containerSlotId: colorSourceSlotId, componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IValue<colorX>>' });
      await client.addComponent({ containerSlotId: colorWriteSlotId, componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,colorX>' });

      await new Promise(resolve => setTimeout(resolve, 10));

      const cellSourceData = await client.getSlot({ slotId: cellSourceSlotId, includeComponentData: true });
      const cellSourceComp = findComponent(cellSourceData.data, 'ObjectValueSource');
      const cellGlobalRefComp = findComponent(cellSourceData.data, 'GlobalReference');
      const cellWriteData = await client.getSlot({ slotId: cellWriteSlotId, includeComponentData: true });
      const cellWriteComp = findComponent(cellWriteData.data, 'ObjectWrite');

      const colorSourceData = await client.getSlot({ slotId: colorSourceSlotId, includeComponentData: true });
      const colorSourceComp = findComponent(colorSourceData.data, 'ValueSource');
      const colorGlobalRefComp = findComponent(colorSourceData.data, 'GlobalReference');
      const colorWriteData = await client.getSlot({ slotId: colorWriteSlotId, includeComponentData: true });
      const colorWriteComp = findComponent(colorWriteData.data, 'ValueWrite');

      // Setup string cell source
      if (cellFields[i]?.id && cellGlobalRefComp?.id) {
        const fieldDetails = await client.getComponent(cellFields[i].id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (valueId) {
          await client.updateComponent({ id: cellGlobalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
        }
        if (cellSourceComp?.id) {
          await client.updateComponent({ id: cellSourceComp.id, members: { Source: { $type: 'reference', targetId: cellGlobalRefComp.id } } as any });
        }
      }

      // Setup color cell source
      if (cellColorFields[i]?.id && colorGlobalRefComp?.id) {
        const fieldDetails = await client.getComponent(cellColorFields[i].id);
        const valueId = fieldDetails.data?.members?.Value?.id;
        if (valueId) {
          await client.updateComponent({ id: colorGlobalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
        }
        if (colorSourceComp?.id) {
          await client.updateComponent({ id: colorSourceComp.id, members: { Source: { $type: 'reference', targetId: colorGlobalRefComp.id } } as any });
        }
      }

      resetCellWriteComps.push({ sourceComp: cellSourceComp, writeComp: cellWriteComp });
      resetColorWriteComps.push({ sourceComp: colorSourceComp, writeComp: colorWriteComp });
    }

    await new Promise(resolve => setTimeout(resolve, 50));

    // Get reset components
    const resetReceiverSlotId = getResetSlotId('Receiver');
    const resetReceiverData = await client.getSlot({ slotId: resetReceiverSlotId, includeComponentData: true });
    const resetReceiverComp = findComponent(resetReceiverData.data, 'DynamicImpulseReceiver');

    const resetTagInputSlotId = getResetSlotId('TagInput');
    const resetTagInputData = await client.getSlot({ slotId: resetTagInputSlotId, includeComponentData: true });
    const resetTagInputComp = findComponent(resetTagInputData.data, 'GlobalValue');

    const resetTrueInputSlotId = getResetSlotId('TrueInput');
    const resetTrueInputData = await client.getSlot({ slotId: resetTrueInputSlotId, includeComponentData: true });
    const resetTrueInputComp = findComponent(resetTrueInputData.data, 'ValueInput');

    const resetFalseInputSlotId = getResetSlotId('FalseInput');
    const resetFalseInputData = await client.getSlot({ slotId: resetFalseInputSlotId, includeComponentData: true });
    const resetFalseInputComp = findComponent(resetFalseInputData.data, 'ValueInput');

    const resetTransparentInputSlotId = getResetSlotId('TransparentInput');
    const resetTransparentInputData = await client.getSlot({ slotId: resetTransparentInputSlotId, includeComponentData: true });
    const resetTransparentInputComp = findComponent(resetTransparentInputData.data, 'ValueInput');

    const resetTurnSourceSlotId = getResetSlotId('TurnSource');
    const resetTurnSourceData = await client.getSlot({ slotId: resetTurnSourceSlotId, includeComponentData: true });
    const resetTurnSourceComp = findComponent(resetTurnSourceData.data, 'ValueSource');
    const resetTurnGlobalRefComp = findComponent(resetTurnSourceData.data, 'GlobalReference');

    const resetTurnWriteSlotId = getResetSlotId('TurnWrite');
    const resetTurnWriteData = await client.getSlot({ slotId: resetTurnWriteSlotId, includeComponentData: true });
    const resetTurnWriteComp = findComponent(resetTurnWriteData.data, 'ValueWrite');

    const resetGameOverSourceSlotId = getResetSlotId('GameOverSource');
    const resetGameOverSourceData = await client.getSlot({ slotId: resetGameOverSourceSlotId, includeComponentData: true });
    const resetGameOverSourceComp = findComponent(resetGameOverSourceData.data, 'ValueSource');
    const resetGameOverGlobalRefComp = findComponent(resetGameOverSourceData.data, 'GlobalReference');

    const resetGameOverWriteSlotId = getResetSlotId('GameOverWrite');
    const resetGameOverWriteData = await client.getSlot({ slotId: resetGameOverWriteSlotId, includeComponentData: true });
    const resetGameOverWriteComp = findComponent(resetGameOverWriteData.data, 'ValueWrite');

    const resetResultSourceSlotId = getResetSlotId('ResultSource');
    const resetResultSourceData = await client.getSlot({ slotId: resetResultSourceSlotId, includeComponentData: true });
    const resetResultSourceComp = findComponent(resetResultSourceData.data, 'ObjectValueSource');
    const resetResultGlobalRefComp = findComponent(resetResultSourceData.data, 'GlobalReference');

    const resetResultWriteSlotId = getResetSlotId('ResultWrite');
    const resetResultWriteData = await client.getSlot({ slotId: resetResultWriteSlotId, includeComponentData: true });
    const resetResultWriteComp = findComponent(resetResultWriteData.data, 'ObjectWrite');

    // Set values
    if (resetTagInputComp?.id) {
      await client.updateComponent({ id: resetTagInputComp.id, members: { Value: { $type: 'string', value: 'Reset' } } as any });
    }
    if (resetTrueInputComp?.id) {
      await client.updateComponent({ id: resetTrueInputComp.id, members: { Value: { $type: 'bool', value: true } } as any });
    }
    if (resetFalseInputComp?.id) {
      await client.updateComponent({ id: resetFalseInputComp.id, members: { Value: { $type: 'bool', value: false } } as any });
    }
    if (resetTransparentInputComp?.id) {
      await client.updateComponent({ id: resetTransparentInputComp.id, members: { Value: { $type: 'colorX', value: TRANSPARENT_COLOR } } as any });
    }

    // Connect receiver to tag
    if (resetReceiverComp?.id && resetTagInputComp?.id) {
      await client.updateComponent({
        id: resetReceiverComp.id,
        members: { Tag: { $type: 'reference', targetId: resetTagInputComp.id } } as any,
      });
    }

    // Setup GlobalReferences
    if (resetTurnGlobalRefComp?.id && isRedTurnField?.id) {
      const fieldDetails = await client.getComponent(isRedTurnField.id);
      const valueId = fieldDetails.data?.members?.Value?.id;
      if (valueId) {
        await client.updateComponent({ id: resetTurnGlobalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
      }
      if (resetTurnSourceComp?.id) {
        await client.updateComponent({ id: resetTurnSourceComp.id, members: { Source: { $type: 'reference', targetId: resetTurnGlobalRefComp.id } } as any });
      }
    }

    if (resetGameOverGlobalRefComp?.id && isGameOverField?.id) {
      const fieldDetails = await client.getComponent(isGameOverField.id);
      const valueId = fieldDetails.data?.members?.Value?.id;
      if (valueId) {
        await client.updateComponent({ id: resetGameOverGlobalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
      }
      if (resetGameOverSourceComp?.id) {
        await client.updateComponent({ id: resetGameOverSourceComp.id, members: { Source: { $type: 'reference', targetId: resetGameOverGlobalRefComp.id } } as any });
      }
    }

    if (resetResultGlobalRefComp?.id && resultTextField?.id) {
      const fieldDetails = await client.getComponent(resultTextField.id);
      const valueId = fieldDetails.data?.members?.Value?.id;
      if (valueId) {
        await client.updateComponent({ id: resetResultGlobalRefComp.id, members: { Reference: { $type: 'reference', targetId: valueId } } as any });
      }
      if (resetResultSourceComp?.id) {
        await client.updateComponent({ id: resetResultSourceComp.id, members: { Source: { $type: 'reference', targetId: resetResultGlobalRefComp.id } } as any });
      }
    }

    // Chain execution: Receiver -> CellWrite_0 -> ... -> CellWrite_41 -> ColorWrite_0 -> ... -> ColorWrite_41 -> TurnWrite -> GameOverWrite -> ResultWrite
    let prevWriteComp: any = null;

    // Chain cell string writes
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const { sourceComp, writeComp } = resetCellWriteComps[i];
      if (!writeComp?.id) continue;

      // Variable <- Source, Value unconnected (null)
      if (sourceComp?.id) {
        await client.updateComponent({
          id: writeComp.id,
          members: { Variable: { $type: 'reference', targetId: sourceComp.id } } as any,
        });
      }

      // Chain from previous
      if (i === 0 && resetReceiverComp?.id) {
        const details = await client.getComponent(resetReceiverComp.id);
        const onTriggeredId = details.data?.members?.OnTriggered?.id;
        await client.updateComponent({
          id: resetReceiverComp.id,
          members: { OnTriggered: { $type: 'reference', id: onTriggeredId, targetId: writeComp.id } } as any,
        });
      } else if (prevWriteComp?.id) {
        const details = await client.getComponent(prevWriteComp.id);
        const onWrittenId = details.data?.members?.OnWritten?.id;
        await client.updateComponent({
          id: prevWriteComp.id,
          members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: writeComp.id } } as any,
        });
      }

      prevWriteComp = writeComp;
    }

    // Chain cell color writes (reset to transparent)
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const { sourceComp, writeComp } = resetColorWriteComps[i];
      if (!writeComp?.id) continue;

      // Variable <- Source, Value <- TransparentInput
      if (sourceComp?.id) {
        await client.updateComponent({
          id: writeComp.id,
          members: {
            Variable: { $type: 'reference', targetId: sourceComp.id },
            Value: { $type: 'reference', targetId: resetTransparentInputComp?.id },
          } as any,
        });
      }

      // Chain from previous
      if (prevWriteComp?.id) {
        const details = await client.getComponent(prevWriteComp.id);
        const onWrittenId = details.data?.members?.OnWritten?.id;
        await client.updateComponent({
          id: prevWriteComp.id,
          members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: writeComp.id } } as any,
        });
      }

      prevWriteComp = writeComp;
    }

    // Last color write -> TurnWrite
    if (prevWriteComp?.id && resetTurnWriteComp?.id) {
      const details = await client.getComponent(prevWriteComp.id);
      const onWrittenId = details.data?.members?.OnWritten?.id;
      await client.updateComponent({
        id: prevWriteComp.id,
        members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: resetTurnWriteComp.id } } as any,
      });
    }

    // TurnWrite: Variable = turnSource, Value = trueInput
    if (resetTurnWriteComp?.id && resetTurnSourceComp?.id && resetTrueInputComp?.id) {
      await client.updateComponent({
        id: resetTurnWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: resetTurnSourceComp.id },
          Value: { $type: 'reference', targetId: resetTrueInputComp.id },
        } as any,
      });
    }

    // TurnWrite -> GameOverWrite
    if (resetTurnWriteComp?.id && resetGameOverWriteComp?.id) {
      const details = await client.getComponent(resetTurnWriteComp.id);
      const onWrittenId = details.data?.members?.OnWritten?.id;
      await client.updateComponent({
        id: resetTurnWriteComp.id,
        members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: resetGameOverWriteComp.id } } as any,
      });
    }

    // GameOverWrite: Variable = gameOverSource, Value = falseInput
    if (resetGameOverWriteComp?.id && resetGameOverSourceComp?.id && resetFalseInputComp?.id) {
      await client.updateComponent({
        id: resetGameOverWriteComp.id,
        members: {
          Variable: { $type: 'reference', targetId: resetGameOverSourceComp.id },
          Value: { $type: 'reference', targetId: resetFalseInputComp.id },
        } as any,
      });
    }

    // GameOverWrite -> ResultWrite
    if (resetGameOverWriteComp?.id && resetResultWriteComp?.id) {
      const details = await client.getComponent(resetGameOverWriteComp.id);
      const onWrittenId = details.data?.members?.OnWritten?.id;
      await client.updateComponent({
        id: resetGameOverWriteComp.id,
        members: { OnWritten: { $type: 'reference', id: onWrittenId, targetId: resetResultWriteComp.id } } as any,
      });
    }

    // ResultWrite: Variable = resultSource, Value unconnected (null)
    if (resetResultWriteComp?.id && resetResultSourceComp?.id) {
      await client.updateComponent({
        id: resetResultWriteComp.id,
        members: { Variable: { $type: 'reference', targetId: resetResultSourceComp.id } } as any,
      });
    }

    console.log('  Reset logic created');

    console.log('\n========================================');
    console.log('Connect 4 game created successfully!');
    console.log('========================================');
    console.log('');
    console.log('NOTE: ProtoFlux nodes created by script need to be');
    console.log('initialized by deactivating and reactivating the slot.');
    console.log(`Main slot: ${slotName}`);

  } finally {
    client.disconnect();
  }
}

main().catch(console.error);
