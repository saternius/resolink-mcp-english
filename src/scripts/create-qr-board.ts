import { ResoniteLinkClient } from '../client.js';

async function main() {
  const url = process.argv[2] || 'ws://localhost:29551';
  const qrContent = process.argv[3] || 'https://example.com';

  const client = new ResoniteLinkClient({ url });
  await client.connect();

  try {
    console.log(`=== Creating QR Code Board ===`);
    console.log(`Content: ${qrContent}\n`);

    // Create slot in the air (Y=15m)
    await client.addSlot({
      name: 'QRCodeBoard',
      position: { x: 0, y: 15, z: 0 },
      scale: { x: 5, y: 5, z: 1 },
      isActive: true
    });

    const board = await client.findSlotByName('QRCodeBoard', 'Root', 1);
    if (!board?.id) throw new Error('Failed to create QRCodeBoard slot');
    const boardId = board.id;
    console.log('Slot created');

    // Add components
    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.QuadMesh' });
    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.MeshRenderer' });
    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.UnlitMaterial' });
    await client.addComponent({ containerSlotId: boardId, componentType: '[FrooxEngine]FrooxEngine.StringQRCodeTexture' });
    console.log('Components added');

    // Get component info
    const slotData = await client.getSlot({ slotId: boardId, depth: 0, includeComponentData: true });
    if (!slotData.success || !slotData.data.components) throw new Error('Failed to get components');

    const mesh = slotData.data.components.find(c => c.componentType === 'FrooxEngine.QuadMesh');
    const renderer = slotData.data.components.find(c => c.componentType === 'FrooxEngine.MeshRenderer');
    const material = slotData.data.components.find(c => c.componentType === 'FrooxEngine.UnlitMaterial');
    const qrTexture = slotData.data.components.find(c => c.componentType === 'FrooxEngine.StringQRCodeTexture');

    if (!mesh || !renderer || !material || !qrTexture) throw new Error('Missing components');

    // Set Mesh on MeshRenderer
    await client.updateComponent({
      id: renderer.id!,
      members: { Mesh: { $type: 'reference', targetId: mesh.id } } as any
    });

    // Set Material on MeshRenderer
    await client.updateComponent({
      id: renderer.id!,
      members: { Materials: { $type: 'list', elements: [{ $type: 'reference', targetId: material.id }] } } as any
    });

    const rendererData = await client.getComponent(renderer.id!);
    if (rendererData.success) {
      const materials = (rendererData.data.members as any)?.Materials;
      if (materials?.elements?.[0]) {
        await client.updateComponent({
          id: renderer.id!,
          members: { Materials: { $type: 'list', elements: [{ $type: 'reference', id: materials.elements[0].id, targetId: material.id }] } } as any
        });
      }
    }
    console.log('MeshRenderer configured');

    // Set Payload on StringQRCodeTexture
    await client.updateComponent({
      id: qrTexture.id!,
      members: {
        Payload: { $type: 'string', value: qrContent },
        Color0: { $type: 'colorX', value: { r: 1, g: 1, b: 1, a: 1, profile: 'sRGB' } },
        Color1: { $type: 'colorX', value: { r: 0, g: 0, b: 0, a: 1, profile: 'sRGB' } }
      } as any
    });
    console.log('QR code texture configured');

    // Set QR texture on UnlitMaterial
    await client.updateComponent({
      id: material.id!,
      members: {
        Texture: { $type: 'reference', targetId: qrTexture.id }
      } as any
    });
    console.log('Material configured');

    console.log('\n=== QR Code Board Created ===');
    console.log('Position: (0, 15, 0) - 15m height in the air');
    console.log('Size: 5m x 5m');
    console.log(`Content: ${qrContent}`);

  } finally {
    client.disconnect();
  }
}

main();
