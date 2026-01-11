/**
 * Script to add ProtoFlux logic to Tic-Tac-Toe game
 *
 * Usage: npx tsx src/scripts/add-tictactoe-logic.ts [slotId] [ws://localhost:3343]
 *
 * Features:
 * - Place O/X on each cell click
 * - Turn management (alternating O and X)
 * - Double-click prevention
 * - Reset functionality
 */
import { ResoniteLinkClient } from '../client.js';

const SLOT_ID = process.argv[2] || 'Reso_49B91';
const WS_URL = process.argv[3] || 'ws://localhost:3343';

async function main() {
  const client = new ResoniteLinkClient({ url: WS_URL });
  await client.connect();

  try {
    console.log('Adding game logic to TicTacToe...\n');
    console.log(`Target slot: ${SLOT_ID}`);

    // 1. Get existing slot structure
    const mainData = await client.getSlot({ slotId: SLOT_ID, depth: 4, includeComponentData: false });
    if (!mainData.success) throw new Error('TicTacToe slot not found');

    const contentSlot = mainData.data?.children?.find((c: any) => c.name === 'Content');
    if (!contentSlot?.id) throw new Error('Content slot not found');

    const boardSlot = contentSlot.children?.find((c: any) => c.name === 'Board');
    if (!boardSlot?.id) throw new Error('Board slot not found');

    const turnDisplaySlot = contentSlot.children?.find((c: any) => c.name === 'TurnDisplay');
    if (!turnDisplaySlot?.id) throw new Error('TurnDisplay slot not found');

    const resetButtonSlot = contentSlot.children?.find((c: any) => c.name === 'ResetButton');
    if (!resetButtonSlot?.id) throw new Error('ResetButton slot not found');

    // Collect cell information
    const cells: { row: number; col: number; slotId: string; textSlotId?: string }[] = [];
    for (const rowSlot of boardSlot.children || []) {
      const rowMatch = rowSlot.name?.value?.match(/Row(\d)/);
      if (!rowMatch) continue;
      const row = parseInt(rowMatch[1]);

      for (const cellSlot of rowSlot.children || []) {
        const cellMatch = cellSlot.name?.value?.match(/Cell_(\d)_(\d)/);
        if (!cellMatch) continue;
        const col = parseInt(cellMatch[2]);

        // Find text slot
        const textSlot = cellSlot.children?.find((c: any) => c.name === 'Text');
        cells.push({ row, col, slotId: cellSlot.id!, textSlotId: textSlot?.id });
      }
    }
    console.log(`  Found ${cells.length} cells`);

    // 2. Create GameState slot
    await client.addSlot({ parentId: SLOT_ID, name: 'GameState' });
    let slotData = await client.getSlot({ slotId: SLOT_ID, depth: 1 });
    const gameStateSlot = slotData.data?.children?.find((c: any) => c.name?.value === 'GameState');
    if (!gameStateSlot?.id) throw new Error('GameState slot not found');
    console.log(`  GameState slot: ${gameStateSlot.id}`);

    // Add ValueField<bool> isOTurn
    await client.addComponent({
      containerSlotId: gameStateSlot.id,
      componentType: '[FrooxEngine]FrooxEngine.ValueField<bool>',
    });

    let gameStateData = await client.getSlot({ slotId: gameStateSlot.id, includeComponentData: true });
    const isOTurnField = gameStateData.data?.components?.find((c: any) =>
      c.componentType?.includes('ValueField') && c.componentType?.includes('bool')
    );

    if (isOTurnField?.id) {
      await client.updateComponent({
        id: isOTurnField.id,
        members: { Value: { $type: 'bool', value: true } } as any,
      });
      console.log(`  isOTurn field: ${isOTurnField.id}`);
    }

    // Add ValueField<string> for each cell
    const cellFields: { row: number; col: number; fieldId: string }[] = [];
    for (const cell of cells) {
      await client.addComponent({
        containerSlotId: gameStateSlot.id,
        componentType: '[FrooxEngine]FrooxEngine.ValueField<string>',
      });
    }

    // Get added fields
    gameStateData = await client.getSlot({ slotId: gameStateSlot.id, includeComponentData: true });
    const stringFields = gameStateData.data?.components?.filter((c: any) =>
      c.componentType?.includes('ValueField') && c.componentType?.includes('string')
    ) || [];

    for (let i = 0; i < cells.length && i < stringFields.length; i++) {
      cellFields.push({
        row: cells[i].row,
        col: cells[i].col,
        fieldId: stringFields[i].id!,
      });
    }
    console.log(`  Created ${cellFields.length} cell state fields`);

    // 3. Add ButtonDynamicImpulseTrigger to each cell
    for (const cell of cells) {
      await client.addComponent({
        containerSlotId: cell.slotId,
        componentType: '[FrooxEngine]FrooxEngine.ButtonDynamicImpulseTrigger',
      });

      const cellData = await client.getSlot({ slotId: cell.slotId, includeComponentData: true });
      const trigger = cellData.data?.components?.find((c: any) =>
        c.componentType?.includes('ButtonDynamicImpulseTrigger')
      );

      if (trigger?.id) {
        await client.updateComponent({
          id: trigger.id,
          members: {
            PressedTag: { $type: 'string', value: `Cell_${cell.row}_${cell.col}` },
          } as any,
        });
      }
    }
    console.log('  Added ButtonDynamicImpulseTrigger to all cells');

    // Add trigger to reset button too
    await client.addComponent({
      containerSlotId: resetButtonSlot.id,
      componentType: '[FrooxEngine]FrooxEngine.ButtonDynamicImpulseTrigger',
    });

    const resetData = await client.getSlot({ slotId: resetButtonSlot.id, includeComponentData: true });
    const resetTrigger = resetData.data?.components?.find((c: any) =>
      c.componentType?.includes('ButtonDynamicImpulseTrigger')
    );

    if (resetTrigger?.id) {
      await client.updateComponent({
        id: resetTrigger.id,
        members: { PressedTag: { $type: 'string', value: 'Reset' } } as any,
      });
    }
    console.log('  Added reset trigger');

    // 4. Drive cell text with ValueFieldDrive
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const field = cellFields[i];
      if (!cell.textSlotId || !field) continue;

      // Get Text component from text slot
      const textData = await client.getSlot({ slotId: cell.textSlotId, includeComponentData: true });
      const textComp = textData.data?.components?.find((c: any) =>
        c.componentType?.includes('Text') && !c.componentType?.includes('TextField')
      );

      if (textComp?.id) {
        // Add ValueFieldDrive to drive Content
        await client.addComponent({
          containerSlotId: gameStateSlot.id,
          componentType: '[FrooxEngine]FrooxEngine.ValueFieldDrive<string>',
        });

        // Get added drive
        const gsData = await client.getSlot({ slotId: gameStateSlot.id, includeComponentData: true });
        const drives = gsData.data?.components?.filter((c: any) =>
          c.componentType?.includes('ValueFieldDrive')
        ) || [];
        const drive = drives[drives.length - 1];

        if (drive?.id) {
          // Get Text component details to get Content field ID
          const textDetails = await client.getComponent(textComp.id);
          const contentFieldId = textDetails.data?.members?.Content?.id;

          // Set up drive
          const driveDetails = await client.getComponent(drive.id);
          await client.updateComponent({
            id: drive.id,
            members: {
              Value: { $type: 'reference', targetId: field.fieldId },
              Target: { $type: 'reference', id: driveDetails.data?.members?.Target?.id, targetId: contentFieldId },
            } as any,
          });
        }
      }
    }
    console.log('  Connected cell fields to Text components');

    // 5. Set up drive for turn display
    const turnData = await client.getSlot({ slotId: turnDisplaySlot.id, includeComponentData: true });
    const turnTextComp = turnData.data?.components?.find((c: any) =>
      c.componentType?.includes('Text') && !c.componentType?.includes('TextField')
    );
    console.log(`  TurnDisplay text component: ${turnTextComp?.id}`);

    // 6. Create ProtoFlux slot
    await client.addSlot({ parentId: SLOT_ID, name: 'Flux' });
    slotData = await client.getSlot({ slotId: SLOT_ID, depth: 1 });
    const fluxSlot = slotData.data?.children?.find((c: any) => c.name?.value === 'Flux');
    if (!fluxSlot?.id) throw new Error('Flux slot not found');
    console.log(`  Flux slot: ${fluxSlot.id}`);

    // Create ProtoFlux for each cell
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const field = cellFields[i];
      if (!field) continue;

      const nodeName = `Cell_${cell.row}_${cell.col}`;
      const xPos = (cell.col - 1) * 0.4;
      const yPos = (1 - cell.row) * 0.3;

      // Cell processing slot
      await client.addSlot({
        parentId: fluxSlot.id,
        name: nodeName,
        position: { x: xPos, y: yPos, z: 0 },
      });

      const fluxData = await client.getSlot({ slotId: fluxSlot.id, depth: 1 });
      const cellFluxSlot = fluxData.data?.children?.find((c: any) => c.name?.value === nodeName);
      if (!cellFluxSlot?.id) continue;

      // DynamicImpulseReceiver
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'Receiver',
        position: { x: 0, y: 0, z: 0 },
      });

      // ValueFieldWrite (cell state)
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'Write',
        position: { x: 0.15, y: 0, z: 0 },
      });

      // If (empty cell check)
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'IfEmpty',
        position: { x: 0.08, y: 0, z: 0 },
      });

      // Conditional (O or X)
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'Conditional',
        position: { x: 0.12, y: 0.05, z: 0 },
      });

      // TurnToggle
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'TurnToggle',
        position: { x: 0.22, y: 0, z: 0 },
      });

      let cellFluxData = await client.getSlot({ slotId: cellFluxSlot.id, depth: 1 });
      const receiverSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'Receiver');
      const writeSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'Write');
      const ifEmptySlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'IfEmpty');
      const conditionalSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'Conditional');
      const turnToggleSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'TurnToggle');

      if (!receiverSlot?.id || !writeSlot?.id || !ifEmptySlot?.id || !conditionalSlot?.id || !turnToggleSlot?.id) continue;

      // Add DynamicImpulseReceiver
      await client.addComponent({
        containerSlotId: receiverSlot.id,
        componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver',
      });

      // Add If
      await client.addComponent({
        containerSlotId: ifEmptySlot.id,
        componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Flow.If',
      });

      // Add ValueEquals<string> (empty string check)
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'IsEmpty',
        position: { x: 0.05, y: 0.08, z: 0 },
      });
      cellFluxData = await client.getSlot({ slotId: cellFluxSlot.id, depth: 1 });
      const isEmptySlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'IsEmpty');

      if (isEmptySlot?.id) {
        await client.addComponent({
          containerSlotId: isEmptySlot.id,
          componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueEquals<string>',
        });
      }

      // Add ValueFieldRead (read cell state)
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'ReadCell',
        position: { x: 0, y: 0.12, z: 0 },
      });
      cellFluxData = await client.getSlot({ slotId: cellFluxSlot.id, depth: 1 });
      const readCellSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'ReadCell');

      if (readCellSlot?.id) {
        await client.addComponent({
          containerSlotId: readCellSlot.id,
          componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Variables.ReadDynamicVariable<string>',
        });
      }

      // Add ValueFieldWrite<string>
      await client.addComponent({
        containerSlotId: writeSlot.id,
        componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Variables.WriteValueField<string>',
      });

      // Add Conditional<string> (select O or X)
      await client.addComponent({
        containerSlotId: conditionalSlot.id,
        componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.Conditional<string>',
      });

      // ValueInput<string> O
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'SymbolO',
        position: { x: 0.1, y: 0.12, z: 0 },
      });

      // ValueInput<string> X
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'SymbolX',
        position: { x: 0.1, y: 0.08, z: 0 },
      });

      cellFluxData = await client.getSlot({ slotId: cellFluxSlot.id, depth: 1 });
      const symbolOSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'SymbolO');
      const symbolXSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'SymbolX');

      if (symbolOSlot?.id) {
        await client.addComponent({
          containerSlotId: symbolOSlot.id,
          componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectInput<string>',
        });
      }

      if (symbolXSlot?.id) {
        await client.addComponent({
          containerSlotId: symbolXSlot.id,
          componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectInput<string>',
        });
      }

      // ReadTurn (read isOTurn)
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'ReadTurn',
        position: { x: 0.08, y: 0.15, z: 0 },
      });
      cellFluxData = await client.getSlot({ slotId: cellFluxSlot.id, depth: 1 });
      const readTurnSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'ReadTurn');

      if (readTurnSlot?.id) {
        await client.addComponent({
          containerSlotId: readTurnSlot.id,
          componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Variables.ReadValueField<bool>',
        });
      }

      // WriteValueField<bool> (turn toggle)
      await client.addComponent({
        containerSlotId: turnToggleSlot.id,
        componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Variables.WriteValueField<bool>',
      });

      // Add Not (invert turn)
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'Not',
        position: { x: 0.18, y: 0.08, z: 0 },
      });
      cellFluxData = await client.getSlot({ slotId: cellFluxSlot.id, depth: 1 });
      const notSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'Not');

      if (notSlot?.id) {
        await client.addComponent({
          containerSlotId: notSlot.id,
          componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.NOT',
        });
      }

      // Add EmptyString
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'EmptyStr',
        position: { x: 0, y: 0.08, z: 0 },
      });
      cellFluxData = await client.getSlot({ slotId: cellFluxSlot.id, depth: 1 });
      const emptyStrSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'EmptyStr');

      if (emptyStrSlot?.id) {
        await client.addComponent({
          containerSlotId: emptyStrSlot.id,
          componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectInput<string>',
        });
      }

      // GlobalValueField reference
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'CellFieldRef',
        position: { x: 0.12, y: -0.05, z: 0 },
      });
      await client.addSlot({
        parentId: cellFluxSlot.id,
        name: 'TurnFieldRef',
        position: { x: 0.18, y: -0.05, z: 0 },
      });

      cellFluxData = await client.getSlot({ slotId: cellFluxSlot.id, depth: 1 });
      const cellFieldRefSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'CellFieldRef');
      const turnFieldRefSlot = cellFluxData.data?.children?.find((c: any) => c.name?.value === 'TurnFieldRef');

      if (cellFieldRefSlot?.id) {
        await client.addComponent({
          containerSlotId: cellFieldRefSlot.id,
          componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IField<string>>',
        });
      }

      if (turnFieldRefSlot?.id) {
        await client.addComponent({
          containerSlotId: turnFieldRefSlot.id,
          componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IField<bool>>',
        });
      }

      console.log(`  Created flux for ${nodeName}`);
    }

    // 7. Reset ProtoFlux
    await client.addSlot({
      parentId: fluxSlot.id,
      name: 'Reset',
      position: { x: 0, y: -0.5, z: 0 },
    });

    let fluxData = await client.getSlot({ slotId: fluxSlot.id, depth: 1 });
    const resetFluxSlot = fluxData.data?.children?.find((c: any) => c.name?.value === 'Reset');

    if (resetFluxSlot?.id) {
      await client.addSlot({
        parentId: resetFluxSlot.id,
        name: 'Receiver',
        position: { x: 0, y: 0, z: 0 },
      });

      await client.addComponent({
        containerSlotId: resetFluxSlot.id,
        componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver',
      });
    }
    console.log('  Created reset flux');

    console.log('\n=== Game Logic Added! ===');
    console.log('\nNote: ProtoFlux node connections must be done manually.');
    console.log('Please make the following connections:');
    console.log('');
    console.log('Each cell (Cell_X_Y):');
    console.log('  1. Set the corresponding tag for DynamicImpulseReceiver');
    console.log('  2. Receiver -> IfEmpty (empty check)');
    console.log('  3. ReadCell -> IsEmpty.A (read cell state)');
    console.log('  4. EmptyStr -> IsEmpty.B (empty string)');
    console.log('  5. IsEmpty -> IfEmpty.Condition');
    console.log('  6. IfEmpty.True -> Write (write to cell)');
    console.log('  7. ReadTurn -> Conditional.Condition');
    console.log('  8. SymbolO ("O") -> Conditional.OnTrue');
    console.log('  9. SymbolX ("X") -> Conditional.OnFalse');
    console.log('  10. Conditional -> Write.Value');
    console.log('  11. Write -> TurnToggle');
    console.log('  12. ReadTurn -> Not -> TurnToggle.Value');
    console.log('');
    console.log('Reset:');
    console.log('  - Clear all cell ValueFields to empty string');
    console.log('  - Reset isOTurn to true');

  } finally {
    client.disconnect();
  }
}

main();
