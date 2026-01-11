/**
 * UIX TODO List Creation Script
 *
 * Usage: npx tsx src/scripts/create-todo-list.ts [ws://localhost:3343]
 */
import { ResoniteLinkClient } from '../client.js';

const WS_URL = process.argv[2] || 'ws://localhost:3343';

async function main() {
  const client = new ResoniteLinkClient({ url: WS_URL });
  await client.connect();

  try {
    console.log('Creating UIX TODO List...\n');

    // 1. Create main slot
    const slotName = `TodoList_${Date.now()}`;
    await client.addSlot({
      name: slotName,
      position: { x: 0, y: 1.5, z: 1.5 },
      isActive: true,
    });

    const mainSlot = await client.findSlotByName(slotName, 'Root', 1);
    if (!mainSlot?.id) throw new Error('Main slot not found');
    const mainId = mainSlot.id;
    console.log(`  Main slot: ${mainId}`);

    // Set scale to 0.001 (UIX uses pixel units)
    await client.updateSlot({
      id: mainId,
      scale: { x: 0.001, y: 0.001, z: 0.001 },
    });
    console.log('  Scale set to 0.001');

    // 2. Add Canvas + Grabbable
    await client.addComponent({
      containerSlotId: mainId,
      componentType: '[FrooxEngine]FrooxEngine.UIX.Canvas',
    });
    await client.addComponent({
      containerSlotId: mainId,
      componentType: '[FrooxEngine]FrooxEngine.Grabbable',
    });

    let slotData = await client.getSlot({ slotId: mainId, includeComponentData: true });
    const canvas = slotData.data?.components?.find((c: any) => c.componentType?.includes('Canvas'));
    if (canvas?.id) {
      await client.updateComponent({
        id: canvas.id,
        members: {
          Size: { $type: 'float2', value: { x: 400, y: 500 } },
        } as any,
      });
      console.log('  Canvas configured');
    }

    // 3. Create background slot
    await client.addSlot({ parentId: mainId, name: 'Background' });
    slotData = await client.getSlot({ slotId: mainId, depth: 1 });
    const bgSlot = slotData.data?.children?.find((c: any) => c.name?.value === 'Background');
    if (!bgSlot?.id) throw new Error('Background slot not found');
    const bgId = bgSlot.id;

    await client.addComponent({ containerSlotId: bgId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: bgId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });

    let bgData = await client.getSlot({ slotId: bgId, includeComponentData: true });
    const bgRect = bgData.data?.components?.find((c: any) => c.componentType?.includes('RectTransform'));
    const bgImage = bgData.data?.components?.find((c: any) => c.componentType?.includes('Image'));

    if (bgRect?.id) {
      await client.updateComponent({
        id: bgRect.id,
        members: {
          AnchorMin: { $type: 'float2', value: { x: 0, y: 0 } },
          AnchorMax: { $type: 'float2', value: { x: 1, y: 1 } },
          OffsetMin: { $type: 'float2', value: { x: 0, y: 0 } },
          OffsetMax: { $type: 'float2', value: { x: 0, y: 0 } },
        } as any,
      });
    }
    if (bgImage?.id) {
      await client.updateComponent({
        id: bgImage.id,
        members: {
          Tint: { $type: 'colorX', value: { r: 0.15, g: 0.15, b: 0.2, a: 0.95 } },
        } as any,
      });
    }
    console.log('  Background created');

    // 4. Content slot (VerticalLayout)
    await client.addSlot({ parentId: mainId, name: 'Content' });
    slotData = await client.getSlot({ slotId: mainId, depth: 1 });
    const contentSlot = slotData.data?.children?.find((c: any) => c.name?.value === 'Content');
    if (!contentSlot?.id) throw new Error('Content slot not found');
    const contentId = contentSlot.id;

    await client.addComponent({ containerSlotId: contentId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: contentId, componentType: '[FrooxEngine]FrooxEngine.UIX.VerticalLayout' });

    let contentData = await client.getSlot({ slotId: contentId, includeComponentData: true });
    const contentRect = contentData.data?.components?.find((c: any) => c.componentType?.includes('RectTransform'));
    const vLayout = contentData.data?.components?.find((c: any) => c.componentType?.includes('VerticalLayout'));

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
          PaddingTop: { $type: 'float', value: 10 },
          PaddingBottom: { $type: 'float', value: 10 },
          PaddingLeft: { $type: 'float', value: 10 },
          PaddingRight: { $type: 'float', value: 10 },
          ForceExpandWidth: { $type: 'bool', value: true },
          ForceExpandHeight: { $type: 'bool', value: false },
        } as any,
      });
    }
    console.log('  VerticalLayout created');

    // 5. Header
    await client.addSlot({ parentId: contentId, name: 'Header' });
    contentData = await client.getSlot({ slotId: contentId, depth: 1 });
    const headerSlot = contentData.data?.children?.find((c: any) => c.name?.value === 'Header');
    if (!headerSlot?.id) throw new Error('Header slot not found');
    const headerId = headerSlot.id;

    await client.addComponent({ containerSlotId: headerId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: headerId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: headerId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

    let headerData = await client.getSlot({ slotId: headerId, includeComponentData: true });
    const headerLayout = headerData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
    const headerText = headerData.data?.components?.find((c: any) => c.componentType?.includes('Text'));

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
          Content: { $type: 'string', value: 'TODO List' },
          Size: { $type: 'float', value: 32 },
          Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
        } as any,
      });
    }
    console.log('  Header created');

    // 6. Input area (TextField + AddButton)
    await client.addSlot({ parentId: contentId, name: 'InputArea' });
    contentData = await client.getSlot({ slotId: contentId, depth: 1 });
    const inputAreaSlot = contentData.data?.children?.find((c: any) => c.name?.value === 'InputArea');
    if (!inputAreaSlot?.id) throw new Error('InputArea slot not found');
    const inputAreaId = inputAreaSlot.id;

    await client.addComponent({ containerSlotId: inputAreaId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: inputAreaId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: inputAreaId, componentType: '[FrooxEngine]FrooxEngine.UIX.HorizontalLayout' });

    let inputAreaData = await client.getSlot({ slotId: inputAreaId, includeComponentData: true });
    const inputAreaLayout = inputAreaData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
    const inputAreaHLayout = inputAreaData.data?.components?.find((c: any) => c.componentType?.includes('HorizontalLayout'));

    if (inputAreaLayout?.id) {
      await client.updateComponent({
        id: inputAreaLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 50 } } as any,
      });
    }
    if (inputAreaHLayout?.id) {
      await client.updateComponent({
        id: inputAreaHLayout.id,
        members: {
          Spacing: { $type: 'float', value: 10 },
          ForceExpandWidth: { $type: 'bool', value: false },
          ForceExpandHeight: { $type: 'bool', value: true },
        } as any,
      });
    }

    // Input field
    await client.addSlot({ parentId: inputAreaId, name: 'InputField' });
    inputAreaData = await client.getSlot({ slotId: inputAreaId, depth: 1 });
    const inputFieldSlot = inputAreaData.data?.children?.find((c: any) => c.name?.value === 'InputField');
    if (!inputFieldSlot?.id) throw new Error('InputField slot not found');
    const inputFieldId = inputFieldSlot.id;

    await client.addComponent({ containerSlotId: inputFieldId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: inputFieldId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: inputFieldId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });
    await client.addComponent({ containerSlotId: inputFieldId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });
    await client.addComponent({ containerSlotId: inputFieldId, componentType: '[FrooxEngine]FrooxEngine.UIX.TextField' });

    let inputFieldData = await client.getSlot({ slotId: inputFieldId, includeComponentData: true });
    const inputFieldLayout = inputFieldData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
    const inputFieldBg = inputFieldData.data?.components?.find((c: any) => c.componentType?.includes('Image'));
    const inputFieldText = inputFieldData.data?.components?.find((c: any) => c.componentType?.includes('Text') && !c.componentType?.includes('TextField'));

    if (inputFieldLayout?.id) {
      await client.updateComponent({
        id: inputFieldLayout.id,
        members: { FlexibleWidth: { $type: 'float', value: 1 } } as any,
      });
    }
    if (inputFieldBg?.id) {
      await client.updateComponent({
        id: inputFieldBg.id,
        members: {
          Tint: { $type: 'colorX', value: { r: 0.2, g: 0.2, b: 0.25, a: 1 } },
        } as any,
      });
    }
    if (inputFieldText?.id) {
      await client.updateComponent({
        id: inputFieldText.id,
        members: {
          Content: { $type: 'string', value: 'Enter task...' },
          Size: { $type: 'float', value: 18 },
          Color: { $type: 'colorX', value: { r: 0.7, g: 0.7, b: 0.7, a: 1 } },
        } as any,
      });
    }

    // Add button
    await client.addSlot({ parentId: inputAreaId, name: 'AddButton' });
    inputAreaData = await client.getSlot({ slotId: inputAreaId, depth: 1 });
    const addButtonSlot = inputAreaData.data?.children?.find((c: any) => c.name?.value === 'AddButton');
    if (!addButtonSlot?.id) throw new Error('AddButton slot not found');
    const addButtonId = addButtonSlot.id;

    await client.addComponent({ containerSlotId: addButtonId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: addButtonId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: addButtonId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });
    await client.addComponent({ containerSlotId: addButtonId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });
    await client.addComponent({ containerSlotId: addButtonId, componentType: '[FrooxEngine]FrooxEngine.UIX.Button' });
    await client.addComponent({ containerSlotId: addButtonId, componentType: '[FrooxEngine]FrooxEngine.ButtonDynamicImpulseTrigger' });

    let addButtonData = await client.getSlot({ slotId: addButtonId, includeComponentData: true });
    const addButtonLayout = addButtonData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
    const addButtonBg = addButtonData.data?.components?.find((c: any) => c.componentType?.includes('Image'));
    const addButtonText = addButtonData.data?.components?.find((c: any) => c.componentType?.includes('Text') && !c.componentType?.includes('TextField'));
    const addButtonTrigger = addButtonData.data?.components?.find((c: any) => c.componentType?.includes('ButtonDynamicImpulseTrigger'));

    if (addButtonLayout?.id) {
      await client.updateComponent({
        id: addButtonLayout.id,
        members: { PreferredWidth: { $type: 'float', value: 80 } } as any,
      });
    }
    if (addButtonBg?.id) {
      await client.updateComponent({
        id: addButtonBg.id,
        members: {
          Tint: { $type: 'colorX', value: { r: 0.2, g: 0.5, b: 0.3, a: 1 } },
        } as any,
      });
    }
    if (addButtonText?.id) {
      await client.updateComponent({
        id: addButtonText.id,
        members: {
          Content: { $type: 'string', value: '+ Add' },
          Size: { $type: 'float', value: 18 },
          Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
        } as any,
      });
    }
    if (addButtonTrigger?.id) {
      await client.updateComponent({
        id: addButtonTrigger.id,
        members: {
          PressedTag: { $type: 'string', value: 'AddTask' },
        } as any,
      });
    }
    console.log('  Input area created');

    // 7. TODO items
    const todoItems = [
      { text: 'Test ResoniteLink', done: true },
      { text: 'Understand UIX structure', done: true },
      { text: 'Create TODO list', done: false },
      { text: 'Add features with ProtoFlux', done: false },
      { text: 'Show to friends', done: false },
    ];

    for (let i = 0; i < todoItems.length; i++) {
      const item = todoItems[i];
      const itemName = `Item_${i}`;

      await client.addSlot({ parentId: contentId, name: itemName });
      contentData = await client.getSlot({ slotId: contentId, depth: 1 });
      const itemSlot = contentData.data?.children?.find((c: any) => c.name?.value === itemName);
      if (!itemSlot?.id) continue;
      const itemId = itemSlot.id;

      await client.addComponent({ containerSlotId: itemId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
      await client.addComponent({ containerSlotId: itemId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
      await client.addComponent({ containerSlotId: itemId, componentType: '[FrooxEngine]FrooxEngine.UIX.HorizontalLayout' });
      await client.addComponent({ containerSlotId: itemId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });

      let itemData = await client.getSlot({ slotId: itemId, includeComponentData: true });
      const itemLayout = itemData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
      const itemHLayout = itemData.data?.components?.find((c: any) => c.componentType?.includes('HorizontalLayout'));
      const itemBg = itemData.data?.components?.find((c: any) => c.componentType?.includes('Image'));

      if (itemLayout?.id) {
        await client.updateComponent({
          id: itemLayout.id,
          members: { PreferredHeight: { $type: 'float', value: 45 } } as any,
        });
      }
      if (itemHLayout?.id) {
        await client.updateComponent({
          id: itemHLayout.id,
          members: {
            Spacing: { $type: 'float', value: 10 },
            PaddingLeft: { $type: 'float', value: 10 },
            PaddingRight: { $type: 'float', value: 10 },
            ForceExpandWidth: { $type: 'bool', value: false },
            ForceExpandHeight: { $type: 'bool', value: true },
          } as any,
        });
      }
      if (itemBg?.id) {
        await client.updateComponent({
          id: itemBg.id,
          members: {
            Tint: { $type: 'colorX', value: { r: 0.25, g: 0.25, b: 0.3, a: 0.8 } },
          } as any,
        });
      }

      // Checkbox
      await client.addSlot({ parentId: itemId, name: 'Check' });
      itemData = await client.getSlot({ slotId: itemId, depth: 1 });
      const checkSlot = itemData.data?.children?.find((c: any) => c.name?.value === 'Check');
      if (!checkSlot?.id) continue;
      const checkId = checkSlot.id;

      await client.addComponent({ containerSlotId: checkId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
      await client.addComponent({ containerSlotId: checkId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
      await client.addComponent({ containerSlotId: checkId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

      let checkData = await client.getSlot({ slotId: checkId, includeComponentData: true });
      const checkLayout = checkData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
      const checkText = checkData.data?.components?.find((c: any) => c.componentType?.includes('Text'));

      if (checkLayout?.id) {
        await client.updateComponent({
          id: checkLayout.id,
          members: { PreferredWidth: { $type: 'float', value: 30 } } as any,
        });
      }
      if (checkText?.id) {
        await client.updateComponent({
          id: checkText.id,
          members: {
            Content: { $type: 'string', value: item.done ? '[x]' : '[ ]' },
            Size: { $type: 'float', value: 20 },
            Color: { $type: 'colorX', value: { r: 0.5, g: 0.8, b: 0.5, a: 1 } },
          } as any,
        });
      }

      // Text
      await client.addSlot({ parentId: itemId, name: 'Label' });
      itemData = await client.getSlot({ slotId: itemId, depth: 1 });
      const labelSlot = itemData.data?.children?.find((c: any) => c.name?.value === 'Label');
      if (!labelSlot?.id) continue;
      const labelId = labelSlot.id;

      await client.addComponent({ containerSlotId: labelId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
      await client.addComponent({ containerSlotId: labelId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
      await client.addComponent({ containerSlotId: labelId, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

      let labelData = await client.getSlot({ slotId: labelId, includeComponentData: true });
      const labelLayout = labelData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
      const labelText = labelData.data?.components?.find((c: any) => c.componentType?.includes('Text'));

      if (labelLayout?.id) {
        await client.updateComponent({
          id: labelLayout.id,
          members: { FlexibleWidth: { $type: 'float', value: 1 } } as any,
        });
      }
      if (labelText?.id) {
        const textColor = item.done
          ? { r: 0.5, g: 0.5, b: 0.5, a: 1 }
          : { r: 1, g: 1, b: 1, a: 1 };
        await client.updateComponent({
          id: labelText.id,
          members: {
            Content: { $type: 'string', value: item.text },
            Size: { $type: 'float', value: 18 },
            Color: { $type: 'colorX', value: textColor },
          } as any,
        });
      }

      console.log(`  Item ${i + 1}: ${item.text}`);
    }

    // 8. Template item (inactive, for duplication)
    await client.addSlot({ parentId: contentId, name: 'Template', isActive: false });
    contentData = await client.getSlot({ slotId: contentId, depth: 1 });
    const templateSlot = contentData.data?.children?.find((c: any) => c.name?.value === 'Template');
    if (!templateSlot?.id) throw new Error('Template slot not found');
    const templateId = templateSlot.id;

    await client.addComponent({ containerSlotId: templateId, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
    await client.addComponent({ containerSlotId: templateId, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
    await client.addComponent({ containerSlotId: templateId, componentType: '[FrooxEngine]FrooxEngine.UIX.HorizontalLayout' });
    await client.addComponent({ containerSlotId: templateId, componentType: '[FrooxEngine]FrooxEngine.UIX.Image' });

    let templateData = await client.getSlot({ slotId: templateId, includeComponentData: true });
    const templateLayout = templateData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
    const templateHLayout = templateData.data?.components?.find((c: any) => c.componentType?.includes('HorizontalLayout'));
    const templateBg = templateData.data?.components?.find((c: any) => c.componentType?.includes('Image'));

    if (templateLayout?.id) {
      await client.updateComponent({
        id: templateLayout.id,
        members: { PreferredHeight: { $type: 'float', value: 45 } } as any,
      });
    }
    if (templateHLayout?.id) {
      await client.updateComponent({
        id: templateHLayout.id,
        members: {
          Spacing: { $type: 'float', value: 10 },
          PaddingLeft: { $type: 'float', value: 10 },
          PaddingRight: { $type: 'float', value: 10 },
          ForceExpandWidth: { $type: 'bool', value: false },
          ForceExpandHeight: { $type: 'bool', value: true },
        } as any,
      });
    }
    if (templateBg?.id) {
      await client.updateComponent({
        id: templateBg.id,
        members: {
          Tint: { $type: 'colorX', value: { r: 0.25, g: 0.25, b: 0.3, a: 0.8 } },
        } as any,
      });
    }

    // Template checkbox
    await client.addSlot({ parentId: templateId, name: 'Check' });
    templateData = await client.getSlot({ slotId: templateId, depth: 1 });
    const tplCheckSlot = templateData.data?.children?.find((c: any) => c.name?.value === 'Check');
    if (tplCheckSlot?.id) {
      await client.addComponent({ containerSlotId: tplCheckSlot.id, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
      await client.addComponent({ containerSlotId: tplCheckSlot.id, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
      await client.addComponent({ containerSlotId: tplCheckSlot.id, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

      const tplCheckData = await client.getSlot({ slotId: tplCheckSlot.id, includeComponentData: true });
      const tplCheckLayout = tplCheckData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
      const tplCheckText = tplCheckData.data?.components?.find((c: any) => c.componentType?.includes('Text'));

      if (tplCheckLayout?.id) {
        await client.updateComponent({
          id: tplCheckLayout.id,
          members: { PreferredWidth: { $type: 'float', value: 30 } } as any,
        });
      }
      if (tplCheckText?.id) {
        await client.updateComponent({
          id: tplCheckText.id,
          members: {
            Content: { $type: 'string', value: '[ ]' },
            Size: { $type: 'float', value: 20 },
            Color: { $type: 'colorX', value: { r: 0.5, g: 0.8, b: 0.5, a: 1 } },
          } as any,
        });
      }
    }

    // Template label
    await client.addSlot({ parentId: templateId, name: 'Label' });
    templateData = await client.getSlot({ slotId: templateId, depth: 1 });
    const tplLabelSlot = templateData.data?.children?.find((c: any) => c.name?.value === 'Label');
    if (tplLabelSlot?.id) {
      await client.addComponent({ containerSlotId: tplLabelSlot.id, componentType: '[FrooxEngine]FrooxEngine.UIX.RectTransform' });
      await client.addComponent({ containerSlotId: tplLabelSlot.id, componentType: '[FrooxEngine]FrooxEngine.UIX.LayoutElement' });
      await client.addComponent({ containerSlotId: tplLabelSlot.id, componentType: '[FrooxEngine]FrooxEngine.UIX.Text' });

      const tplLabelData = await client.getSlot({ slotId: tplLabelSlot.id, includeComponentData: true });
      const tplLabelLayout = tplLabelData.data?.components?.find((c: any) => c.componentType?.includes('LayoutElement'));
      const tplLabelText = tplLabelData.data?.components?.find((c: any) => c.componentType?.includes('Text'));

      if (tplLabelLayout?.id) {
        await client.updateComponent({
          id: tplLabelLayout.id,
          members: { FlexibleWidth: { $type: 'float', value: 1 } } as any,
        });
      }
      if (tplLabelText?.id) {
        await client.updateComponent({
          id: tplLabelText.id,
          members: {
            Content: { $type: 'string', value: 'New Task' },
            Size: { $type: 'float', value: 18 },
            Color: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1 } },
          } as any,
        });
      }
    }
    console.log('  Template created');

    // 9. ProtoFlux (task addition logic)
    await client.addSlot({ parentId: mainId, name: 'ProtoFlux' });
    slotData = await client.getSlot({ slotId: mainId, depth: 1 });
    const fluxSlot = slotData.data?.children?.find((c: any) => c.name?.value === 'ProtoFlux');
    if (!fluxSlot?.id) throw new Error('ProtoFlux slot not found');
    const fluxId = fluxSlot.id;

    // DynamicImpulseReceiver slot
    await client.addSlot({ parentId: fluxId, name: 'Receiver', position: { x: 0, y: 0, z: 0 } });
    // TemplateRef slot
    await client.addSlot({ parentId: fluxId, name: 'TemplateRef', position: { x: 0, y: -0.05, z: 0 } });
    // ParentRef slot
    await client.addSlot({ parentId: fluxId, name: 'ParentRef', position: { x: 0, y: -0.1, z: 0 } });
    // DuplicateSlot slot
    await client.addSlot({ parentId: fluxId, name: 'Duplicate', position: { x: 0.15, y: 0, z: 0 } });

    let fluxData = await client.getSlot({ slotId: fluxId, depth: 1 });
    const receiverSlot = fluxData.data?.children?.find((c: any) => c.name?.value === 'Receiver');
    const templateRefSlot = fluxData.data?.children?.find((c: any) => c.name?.value === 'TemplateRef');
    const parentRefSlot = fluxData.data?.children?.find((c: any) => c.name?.value === 'ParentRef');
    const duplicateSlot = fluxData.data?.children?.find((c: any) => c.name?.value === 'Duplicate');

    if (!receiverSlot?.id || !templateRefSlot?.id || !parentRefSlot?.id || !duplicateSlot?.id) {
      throw new Error('ProtoFlux slots not found');
    }

    // Add DynamicImpulseReceiver
    await client.addComponent({
      containerSlotId: receiverSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions.DynamicImpulseReceiver',
    });

    // RefObjectInput<Slot> for Template
    await client.addComponent({
      containerSlotId: templateRefSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.Slot>',
    });

    // RefObjectInput<Slot> for Parent (Content)
    await client.addComponent({
      containerSlotId: parentRefSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.RefObjectInput<[FrooxEngine]FrooxEngine.Slot>',
    });

    // Add DuplicateSlot
    await client.addComponent({
      containerSlotId: duplicateSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Slots.DuplicateSlot',
    });

    // Get component IDs
    const [receiverData, templateRefData, parentRefData, duplicateData] = await Promise.all([
      client.getSlot({ slotId: receiverSlot.id, includeComponentData: true }),
      client.getSlot({ slotId: templateRefSlot.id, includeComponentData: true }),
      client.getSlot({ slotId: parentRefSlot.id, includeComponentData: true }),
      client.getSlot({ slotId: duplicateSlot.id, includeComponentData: true }),
    ]);

    const receiverComp = receiverData.data?.components?.find((c: any) => c.componentType?.includes('DynamicImpulseReceiver'));
    const templateRefComp = templateRefData.data?.components?.find((c: any) => c.componentType?.includes('RefObjectInput'));
    const parentRefComp = parentRefData.data?.components?.find((c: any) => c.componentType?.includes('RefObjectInput'));
    const duplicateComp = duplicateData.data?.components?.find((c: any) => c.componentType?.includes('DuplicateSlot'));

    // Receiver setup: Tag = "AddTask"
    if (receiverComp?.id) {
      // Tag needs to reference GlobalValueProxy<string> - may be difficult to set directly
      console.log(`  Receiver: ${receiverComp.id} (Please manually set Tag to "AddTask")`);
    }

    // TemplateRef setup: Target = Template slot
    if (templateRefComp?.id) {
      await client.updateComponent({
        id: templateRefComp.id,
        members: {
          Target: { $type: 'reference', targetId: templateId },
        } as any,
      });
      console.log('  TemplateRef -> Template connected');
    }

    // ParentRef setup: Target = Content slot
    if (parentRefComp?.id) {
      await client.updateComponent({
        id: parentRefComp.id,
        members: {
          Target: { $type: 'reference', targetId: contentId },
        } as any,
      });
      console.log('  ParentRef -> Content connected');
    }

    // DuplicateSlot connection
    if (duplicateComp?.id && receiverComp?.id && templateRefComp?.id && parentRefComp?.id) {
      await client.updateComponent({
        id: duplicateComp.id,
        members: {
          Template: { $type: 'reference', targetId: templateRefComp.id },
          OverrideParent: { $type: 'reference', targetId: parentRefComp.id },
        } as any,
      });

      // Receiver's OnTriggered -> DuplicateSlot
      await client.updateComponent({
        id: receiverComp.id,
        members: {
          OnTriggered: { $type: 'reference', targetId: duplicateComp.id },
        } as any,
      });
    }

    console.log('  ProtoFlux created');
    console.log('    -> Please set DynamicImpulseReceiver Tag to "AddTask"');

    console.log('\nUIX TODO List created!');
    console.log(`  Location: ${slotName}`);

  } finally {
    client.disconnect();
  }
}

main();
