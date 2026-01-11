import { ResoniteLinkClient } from '../client.js';

async function main() {
  const url = process.argv[2] || 'ws://localhost:29551';
  const client = new ResoniteLinkClient({ url });
  await client.connect();

  try {
    // Gymnasium dimensions
    const width = 30;   // X axis width
    const length = 50;  // Z axis depth
    const height = 15;  // Y axis height
    const wallThickness = 0.5;
    const floorThickness = 0.3;

    // Create root slot
    const rootName = `Gymnasium_${Date.now()}`;
    await client.addSlot({
      name: rootName,
      position: { x: 0, y: 0, z: 10 },
      isActive: true,
    });
    const root = await client.findSlotByName(rootName, 'Root', 1);
    if (!root?.id) throw new Error('Root slot not found');

    console.log('Creating gymnasium structure...');

    // Helper function: create box part
    async function createBoxPart(
      name: string,
      position: { x: number; y: number; z: number },
      size: { x: number; y: number; z: number },
      color: { r: number; g: number; b: number; a: number },
      metallic: number = 0.0,
      smoothness: number = 0.3
    ) {
      await client.addSlot({ parentId: root!.id, name, position, isActive: true });
      const rootData = await client.getSlot({ slotId: root!.id, depth: 1 });
      const slot = rootData.data?.children?.find((c: any) => c.name?.value === name);
      if (!slot?.id) throw new Error(`${name} slot not found`);

      // BoxMesh
      await client.addComponent({
        containerSlotId: slot.id,
        componentType: '[FrooxEngine]FrooxEngine.BoxMesh',
      });

      // MeshRenderer
      await client.addComponent({
        containerSlotId: slot.id,
        componentType: '[FrooxEngine]FrooxEngine.MeshRenderer',
      });

      // PBS_Metallic
      await client.addComponent({
        containerSlotId: slot.id,
        componentType: '[FrooxEngine]FrooxEngine.PBS_Metallic',
      });

      // Get components
      const slotData = await client.getSlot({ slotId: slot.id, includeComponentData: true });
      const mesh = slotData.data?.components?.find((c: any) => c.componentType?.includes('BoxMesh'));
      const renderer = slotData.data?.components?.find((c: any) => c.componentType?.includes('MeshRenderer'));
      const material = slotData.data?.components?.find((c: any) => c.componentType?.includes('PBS_Metallic'));

      // BoxMesh size settings
      await client.updateComponent({
        id: mesh.id,
        members: {
          Size: { $type: 'float3', value: size },
        } as any,
      });

      // Material settings
      await client.updateComponent({
        id: material.id,
        members: {
          AlbedoColor: { $type: 'colorX', value: { ...color, profile: 'sRGB' } },
          Metallic: { $type: 'float', value: metallic },
          Smoothness: { $type: 'float', value: smoothness },
        } as any,
      });

      // Set Mesh and Material on MeshRenderer
      await client.updateComponent({
        id: renderer.id,
        members: {
          Mesh: { $type: 'reference', targetId: mesh.id },
        } as any,
      });

      // Materials list setup (2 stages)
      await client.updateComponent({
        id: renderer.id,
        members: {
          Materials: { $type: 'list', elements: [{ $type: 'reference', targetId: material.id }] },
        } as any,
      });
      const rendererData = await client.getComponent(renderer.id);
      const elementId = rendererData.data.members.Materials.elements[0].id;
      await client.updateComponent({
        id: renderer.id,
        members: {
          Materials: { $type: 'list', elements: [{ $type: 'reference', id: elementId, targetId: material.id }] },
        } as any,
      });

      return slot.id;
    }

    // Helper function: create light
    async function createLight(
      name: string,
      position: { x: number; y: number; z: number },
      color: { r: number; g: number; b: number },
      intensity: number,
      range: number
    ) {
      await client.addSlot({ parentId: root!.id, name, position, isActive: true });
      const rootData = await client.getSlot({ slotId: root!.id, depth: 1 });
      const slot = rootData.data?.children?.find((c: any) => c.name?.value === name);
      if (!slot?.id) throw new Error(`${name} slot not found`);

      await client.addComponent({
        containerSlotId: slot.id,
        componentType: '[FrooxEngine]FrooxEngine.Light',
      });

      const slotData = await client.getSlot({ slotId: slot.id, includeComponentData: true });
      const light = slotData.data?.components?.find((c: any) => c.componentType?.includes('Light'));

      await client.updateComponent({
        id: light.id,
        members: {
          LightType: { $type: 'enum', value: 'Point', enumType: 'LightType' },
          Color: { $type: 'colorX', value: { r: color.r, g: color.g, b: color.b, a: 1, profile: 'sRGB' } },
          Intensity: { $type: 'float', value: intensity },
          Range: { $type: 'float', value: range },
        } as any,
      });

      return slot.id;
    }

    // === Floor ===
    console.log('Creating floor...');
    await createBoxPart(
      'Floor',
      { x: 0, y: -floorThickness / 2, z: 0 },
      { x: width, y: floorThickness, z: length },
      { r: 0.85, g: 0.75, b: 0.55, a: 1 }, // wood-like color
      0.0,
      0.4
    );

    // === Court lines (thin on floor) ===
    console.log('Creating court lines...');
    const lineHeight = 0.02;
    const lineY = floorThickness / 2 + lineHeight / 2;

    // Center line
    await createBoxPart(
      'CenterLine',
      { x: 0, y: lineY, z: 0 },
      { x: 0.1, y: lineHeight, z: length - 4 },
      { r: 1, g: 1, b: 1, a: 1 },
      0.0,
      0.2
    );

    // Center circle (using square as substitute)
    await createBoxPart(
      'CenterCircle',
      { x: 0, y: lineY, z: 0 },
      { x: 6, y: lineHeight, z: 6 },
      { r: 1, g: 1, b: 1, a: 1 },
      0.0,
      0.2
    );

    // Court boundary lines
    const courtWidth = width - 4;
    const courtLength = length - 4;
    // Left
    await createBoxPart(
      'CourtLineLeft',
      { x: -courtWidth / 2, y: lineY, z: 0 },
      { x: 0.1, y: lineHeight, z: courtLength },
      { r: 1, g: 1, b: 1, a: 1 },
      0.0,
      0.2
    );
    // Right
    await createBoxPart(
      'CourtLineRight',
      { x: courtWidth / 2, y: lineY, z: 0 },
      { x: 0.1, y: lineHeight, z: courtLength },
      { r: 1, g: 1, b: 1, a: 1 },
      0.0,
      0.2
    );
    // Front
    await createBoxPart(
      'CourtLineFront',
      { x: 0, y: lineY, z: courtLength / 2 },
      { x: courtWidth, y: lineHeight, z: 0.1 },
      { r: 1, g: 1, b: 1, a: 1 },
      0.0,
      0.2
    );
    // Back
    await createBoxPart(
      'CourtLineBack',
      { x: 0, y: lineY, z: -courtLength / 2 },
      { x: courtWidth, y: lineHeight, z: 0.1 },
      { r: 1, g: 1, b: 1, a: 1 },
      0.0,
      0.2
    );

    // === Walls ===
    console.log('Creating walls...');
    const wallColor = { r: 0.9, g: 0.9, b: 0.85, a: 1 }; // off-white

    // Left wall
    await createBoxPart(
      'WallLeft',
      { x: -width / 2 - wallThickness / 2, y: height / 2, z: 0 },
      { x: wallThickness, y: height, z: length },
      wallColor,
      0.0,
      0.1
    );

    // Right wall
    await createBoxPart(
      'WallRight',
      { x: width / 2 + wallThickness / 2, y: height / 2, z: 0 },
      { x: wallThickness, y: height, z: length },
      wallColor,
      0.0,
      0.1
    );

    // Front wall
    await createBoxPart(
      'WallFront',
      { x: 0, y: height / 2, z: length / 2 + wallThickness / 2 },
      { x: width + wallThickness * 2, y: height, z: wallThickness },
      wallColor,
      0.0,
      0.1
    );

    // Back wall
    await createBoxPart(
      'WallBack',
      { x: 0, y: height / 2, z: -length / 2 - wallThickness / 2 },
      { x: width + wallThickness * 2, y: height, z: wallThickness },
      wallColor,
      0.0,
      0.1
    );

    // === Ceiling ===
    console.log('Creating ceiling...');
    await createBoxPart(
      'Ceiling',
      { x: 0, y: height + floorThickness / 2, z: 0 },
      { x: width + wallThickness * 2, y: floorThickness, z: length + wallThickness * 2 },
      { r: 0.95, g: 0.95, b: 0.95, a: 1 },
      0.0,
      0.1
    );

    // === Ceiling beams (truss style) ===
    console.log('Creating ceiling beams...');
    const beamColor = { r: 0.3, g: 0.3, b: 0.35, a: 1 }; // dark gray
    const beamWidth = 0.8;
    const beamHeight = 1.5;
    const beamSpacing = 8;
    const numBeams = Math.floor(length / beamSpacing);

    for (let i = 0; i <= numBeams; i++) {
      const zPos = -length / 2 + i * beamSpacing + beamSpacing / 2;
      await createBoxPart(
        `Beam_${i}`,
        { x: 0, y: height - beamHeight / 2, z: zPos },
        { x: width, y: beamHeight, z: beamWidth },
        beamColor,
        0.5,
        0.3
      );
    }

    // === Lighting ===
    console.log('Creating lights...');
    const lightSpacingX = width / 3;
    const lightSpacingZ = length / 5;
    const lightY = height - 2;

    for (let xi = -1; xi <= 1; xi++) {
      for (let zi = -2; zi <= 2; zi++) {
        await createLight(
          `Light_${xi + 1}_${zi + 2}`,
          { x: xi * lightSpacingX, y: lightY, z: zi * lightSpacingZ },
          { r: 1, g: 0.98, b: 0.9 }, // warm white
          2.0,
          25
        );
      }
    }

    // === Stage (front) ===
    console.log('Creating stage...');
    const stageDepth = 6;
    const stageHeight = 1.2;
    await createBoxPart(
      'Stage',
      { x: 0, y: stageHeight / 2, z: length / 2 - stageDepth / 2 - 2 },
      { x: width - 4, y: stageHeight, z: stageDepth },
      { r: 0.4, g: 0.25, b: 0.15, a: 1 }, // dark brown
      0.0,
      0.5
    );

    // === Basketball hoop poles (both ends) ===
    console.log('Creating basketball hoops...');
    const hoopZ = length / 2 - 3;
    const backboardColor = { r: 0.9, g: 0.9, b: 0.9, a: 1 };
    const poleColor = { r: 0.5, g: 0.5, b: 0.55, a: 1 };

    // Pole (front)
    await createBoxPart(
      'HoopPole_Front',
      { x: 0, y: 4, z: hoopZ },
      { x: 0.15, y: 8, z: 0.15 },
      poleColor,
      0.8,
      0.6
    );
    // Backboard (front)
    await createBoxPart(
      'Backboard_Front',
      { x: 0, y: 4.5, z: hoopZ - 0.6 },
      { x: 1.8, y: 1.2, z: 0.05 },
      backboardColor,
      0.1,
      0.8
    );
    // Ring (front)
    await createBoxPart(
      'Ring_Front',
      { x: 0, y: 3.8, z: hoopZ - 1.0 },
      { x: 0.45, y: 0.05, z: 0.45 },
      { r: 1, g: 0.4, b: 0.1, a: 1 },
      0.6,
      0.4
    );

    // Pole (back)
    await createBoxPart(
      'HoopPole_Back',
      { x: 0, y: 4, z: -hoopZ },
      { x: 0.15, y: 8, z: 0.15 },
      poleColor,
      0.8,
      0.6
    );
    // Backboard (back)
    await createBoxPart(
      'Backboard_Back',
      { x: 0, y: 4.5, z: -hoopZ + 0.6 },
      { x: 1.8, y: 1.2, z: 0.05 },
      backboardColor,
      0.1,
      0.8
    );
    // Ring (back)
    await createBoxPart(
      'Ring_Back',
      { x: 0, y: 3.8, z: -hoopZ + 1.0 },
      { x: 0.45, y: 0.05, z: 0.45 },
      { r: 1, g: 0.4, b: 1, a: 1 },
      0.6,
      0.4
    );

    console.log('✅ Gymnasium created successfully!');
    console.log(`   Size: ${width}m x ${length}m x ${height}m`);
    console.log(`   Features: Floor with court lines, walls, ceiling with beams, lights, stage, basketball hoops`);

  } finally {
    client.disconnect();
  }
}

main().catch(console.error);
