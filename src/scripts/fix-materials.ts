import { ResoniteLinkClient } from '../client.js';

interface PartFix {
  name: string;
  materialRefId: string;  // Materials[0] ID
  materialId: string;      // PBS_Metallic ID
}

async function main() {
  const url = process.argv[2] || 'ws://localhost:31541';

  const client = new ResoniteLinkClient({ url });
  await client.connect();

  try {
    // First check MeshRenderer of each part and get Materials[0] ID
    const parts = [
      { name: 'Seat', meshRendererId: 'Reso_A8E4', slotId: 'Reso_A80F' },
      { name: 'Backrest', meshRendererId: 'Reso_A919', slotId: 'Reso_A8E5' },
      { name: 'Leg_FL', meshRendererId: 'Reso_A91B', slotId: 'Reso_A8E6' },
      { name: 'Leg_FR', meshRendererId: 'Reso_A91D', slotId: 'Reso_A8E7' },
      { name: 'Leg_BL', meshRendererId: 'Reso_A91F', slotId: 'Reso_A8E8' },
      { name: 'Leg_BR', meshRendererId: 'Reso_A921', slotId: 'Reso_A8E9' },
    ];

    for (const part of parts) {
      console.log(`\nFixing ${part.name}...`);

      // Get MeshRenderer details
      const compData = await client.getComponent(part.meshRendererId);
      if (!compData.success) {
        console.error(`  Failed to get MeshRenderer: ${compData.errorInfo}`);
        continue;
      }

      const members = compData.data.members as any;
      const materials = members?.Materials;

      if (!materials || !materials.elements || materials.elements.length === 0) {
        console.log(`  No Materials elements found, adding new one...`);
        // Add if list has no elements
        continue;
      }

      const materialRef = materials.elements[0];
      console.log(`  Materials[0] ID: ${materialRef.id}, current target: ${materialRef.targetId}`);

      // Get PBS_Metallic ID
      const slotData = await client.getSlot({
        slotId: part.slotId,
        depth: 0,
        includeComponentData: true,
      });

      if (!slotData.success || !slotData.data.components) {
        console.error(`  Failed to get slot data`);
        continue;
      }

      const pbsMaterial = slotData.data.components.find(
        c => c.componentType === 'FrooxEngine.PBS_Metallic'
      );

      if (!pbsMaterial) {
        console.error(`  PBS_Metallic not found`);
        continue;
      }

      console.log(`  PBS_Metallic ID: ${pbsMaterial.id}`);

      // Update Materials[0] targetId
      // Directly update reference element - specify ID in updateComponent
      const response = await client.updateComponent({
        id: part.meshRendererId,
        members: {
          Materials: {
            $type: 'list',
            elements: [
              {
                $type: 'reference',
                id: materialRef.id,  // Specify existing element ID
                targetId: pbsMaterial.id,
              },
            ],
          },
        } as any,
      });

      if (response.success) {
        console.log(`  Fixed!`);
      } else {
        console.error(`  Error: ${response.errorInfo}`);
      }
    }

    console.log('\nDone!');
  } finally {
    client.disconnect();
  }
}

main();
