import { ResoniteLinkClient } from '../client.js';

async function enableCharacterColliders(client: ResoniteLinkClient, slotId: string, depth: number = 0): Promise<number> {
  let count = 0;

  const slotData = await client.getSlot({ slotId, depth: 0, includeComponentData: true });
  if (!slotData.success || !slotData.data) return count;

  // Update BoxCollider on this slot
  if (slotData.data.components) {
    for (const comp of slotData.data.components) {
      if (comp.componentType === 'FrooxEngine.BoxCollider' && comp.id) {
        try {
          await client.updateComponent({
            id: comp.id,
            members: {
              CharacterCollider: { $type: 'bool', value: true }
            } as any
          });
          count++;
          if (count % 20 === 0) {
            console.log(`  Updated ${count} colliders...`);
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }
  }

  // Recursively process child slots
  if (slotData.data.children) {
    for (const child of slotData.data.children) {
      if (child.id) {
        count += await enableCharacterColliders(client, child.id, depth + 1);
      }
    }
  }

  return count;
}

async function main() {
  const url = process.argv[2] || 'ws://localhost:29551';
  const client = new ResoniteLinkClient({ url });
  await client.connect();

  try {
    console.log('=== Enabling CharacterCollider ===\n');

    // Find FPS_RuinsMap
    const map = await client.findSlotByName('FPS_RuinsMap', 'Root', 1);
    if (!map?.id) {
      console.log('FPS_RuinsMap not found');
      return;
    }

    console.log('Searching and updating colliders...');
    const count = await enableCharacterColliders(client, map.id);

    console.log(`\n=== Complete: Enabled CharacterCollider on ${count} BoxColliders ===`);

  } finally {
    client.disconnect();
  }
}

main();
