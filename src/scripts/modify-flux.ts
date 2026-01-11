import { ResoniteLinkClient } from '../client.js';

const WS_URL = process.argv[2] || 'ws://localhost:29551';

async function main() {
  const client = new ResoniteLinkClient({ url: WS_URL });
  await client.connect();

  try {
    // Change ValueInput
    // Reso_2DB9B is Add's B input (current value: 2)
    // Reso_2DE19 is Mul's B input (current value: 4)

    console.log('=== Current Values ===');

    // Get current values
    const addBInput = await client.getComponent('Reso_2DB9B');
    const mulBInput = await client.getComponent('Reso_2DE19');

    console.log('Add.B (Reso_2DB9B):', (addBInput.data?.members as any)?.Value?.value);
    console.log('Mul.B (Reso_2DE19):', (mulBInput.data?.members as any)?.Value?.value);

    // Change Add.B to 3
    console.log('\n=== Changing Add.B to 3 ===');
    const result1 = await client.updateComponent({
      id: 'Reso_2DB9B',
      members: {
        Value: { $type: 'float', value: 3 }
      } as any
    });
    console.log('Result:', result1.success, result1.errorInfo);

    // Change Mul.B to 5
    console.log('\n=== Changing Mul.B to 5 ===');
    const result2 = await client.updateComponent({
      id: 'Reso_2DE19',
      members: {
        Value: { $type: 'float', value: 5 }
      } as any
    });
    console.log('Result:', result2.success, result2.errorInfo);

    // Check values after change
    console.log('\n=== Values After Change ===');
    const addBInputAfter = await client.getComponent('Reso_2DB9B');
    const mulBInputAfter = await client.getComponent('Reso_2DE19');

    console.log('Add.B (Reso_2DB9B):', (addBInputAfter.data?.members as any)?.Value?.value);
    console.log('Mul.B (Reso_2DE19):', (mulBInputAfter.data?.members as any)?.Value?.value);

    console.log('\nCheck it in Resonite!');
    console.log('Calculation should be: (A + 3) * 5');

  } finally {
    client.disconnect();
  }
}

main();
