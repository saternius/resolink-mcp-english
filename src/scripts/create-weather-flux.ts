/**
 * 天気予報取得 ProtoFlux スクリプト
 *
 * wttr.in APIを使用して天気を取得し表示する
 * PhysicalButton + ButtonEvents + DataModelObjectFieldStore で永続化
 *
 * 使い方: npx tsx src/scripts/create-weather-flux.ts [ws://localhost:3343]
 */
import { ResoniteLinkClient } from '../client.js';

const WS_URL = process.argv[2] || 'ws://localhost:3343';

async function main() {
  const client = new ResoniteLinkClient({ url: WS_URL });
  await client.connect();

  try {
    console.log('Creating Weather ProtoFlux...\n');

    // Create container slot
    const slotName = `Weather_${Date.now()}`;
    await client.addSlot({
      name: slotName,
      position: { x: 0, y: 1.5, z: 2 },
      isActive: true
    });
    const container = await client.findSlotByName(slotName, 'Root', 1);
    if (!container?.id) throw new Error('Failed to create container');
    const containerId = container.id;
    console.log(`  Created container: ${slotName} (${containerId})`);

    // Add Grabbable
    await client.addComponent({
      containerSlotId: containerId,
      componentType: '[FrooxEngine]FrooxEngine.Grabbable',
    });

    // Create child slots for each node
    const nodePositions = [
      { name: 'UrlInput', x: -0.5, y: 0.1, z: 0 },
      { name: 'Button', x: -0.5, y: -0.15, z: 0 },
      { name: 'ButtonEvents', x: -0.2, y: 0.05, z: 0 },
      { name: 'StartAsync', x: -0.05, y: 0.05, z: 0 },
      { name: 'WebRequest', x: 0.1, y: 0.05, z: 0 },
      { name: 'Store', x: 0.25, y: 0.1, z: 0 },
      { name: 'Write', x: 0.25, y: -0.05, z: 0 },
      // Display is now on Store slot (same slot as DataModelObjectFieldStore)
    ];

    for (const node of nodePositions) {
      await client.addSlot({
        parentId: containerId,
        name: node.name,
        position: { x: node.x, y: node.y, z: node.z },
        isActive: true,
      });
    }
    console.log('  Created child slots');

    // Get slot IDs
    const containerData = await client.getSlot({ slotId: containerId, depth: 1, includeComponentData: false });
    const children = containerData.data?.children || [];

    const urlInputSlot = children.find(c => c.name?.value === 'UrlInput');
    const buttonSlot = children.find(c => c.name?.value === 'Button');
    const buttonEventsSlot = children.find(c => c.name?.value === 'ButtonEvents');
    const startAsyncSlot = children.find(c => c.name?.value === 'StartAsync');
    const webRequestSlot = children.find(c => c.name?.value === 'WebRequest');
    const storeSlot = children.find(c => c.name?.value === 'Store');
    const writeSlot = children.find(c => c.name?.value === 'Write');

    if (!urlInputSlot?.id || !buttonSlot?.id || !buttonEventsSlot?.id || !startAsyncSlot?.id ||
        !webRequestSlot?.id || !storeSlot?.id || !writeSlot?.id) {
      throw new Error('Failed to find child slots');
    }

    // ============ Add components ============

    // 1. URL Input (ValueObjectInput<Uri>)
    await client.addComponent({
      containerSlotId: urlInputSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ValueObjectInput<Uri>',
    });
    console.log('  Added ValueObjectInput<Uri>');

    // 2. Physical Button (visual + interaction)
    await client.addComponent({
      containerSlotId: buttonSlot.id,
      componentType: '[FrooxEngine]FrooxEngine.BoxMesh',
    });
    await client.addComponent({
      containerSlotId: buttonSlot.id,
      componentType: '[FrooxEngine]FrooxEngine.MeshRenderer',
    });
    await client.addComponent({
      containerSlotId: buttonSlot.id,
      componentType: '[FrooxEngine]FrooxEngine.PBS_Metallic',
    });
    await client.addComponent({
      containerSlotId: buttonSlot.id,
      componentType: '[FrooxEngine]FrooxEngine.BoxCollider',
    });
    await client.addComponent({
      containerSlotId: buttonSlot.id,
      componentType: '[FrooxEngine]FrooxEngine.PhysicalButton',
    });

    // Update button slot scale
    await client.updateSlot({
      id: buttonSlot.id,
      scale: { x: 0.1, y: 0.05, z: 0.1 },
    });
    console.log('  Added Button with PhysicalButton');

    // 3. ButtonEvents (ProtoFlux node)
    await client.addComponent({
      containerSlotId: buttonEventsSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Interaction.ButtonEvents',
    });
    // Add GlobalReference<IButton> for ButtonEvents.Button input
    await client.addComponent({
      containerSlotId: buttonEventsSlot.id,
      componentType: '[FrooxEngine]FrooxEngine.ProtoFlux.GlobalReference<[FrooxEngine]FrooxEngine.IButton>',
    });
    console.log('  Added ButtonEvents + GlobalReference<IButton>');

    // 4. StartAsyncTask (bridge between sync and async)
    await client.addComponent({
      containerSlotId: startAsyncSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Async.StartAsyncTask',
    });
    console.log('  Added StartAsyncTask');

    // 5. GET_String (HTTP GET request)
    await client.addComponent({
      containerSlotId: webRequestSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Network.GET_String',
    });
    console.log('  Added GET_String');

    // 6. DataModelObjectFieldStore<string> (persistent storage)
    await client.addComponent({
      containerSlotId: storeSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Variables.DataModelObjectFieldStore<string>',
    });
    console.log('  Added DataModelObjectFieldStore<string>');

    // 7. ObjectWrite<FrooxEngineContext, string> (write to storage)
    await client.addComponent({
      containerSlotId: writeSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectWrite<[FrooxEngine]FrooxEngine.ProtoFlux.FrooxEngineContext,string>',
    });
    console.log('  Added ObjectWrite<FrooxEngineContext, string>');

    // 8. ObjectDisplay<string> on Store slot (to read from DataModelObjectFieldStore)
    await client.addComponent({
      containerSlotId: storeSlot.id,
      componentType: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.ObjectDisplay<string>',
    });
    console.log('  Added ObjectDisplay<string> on Store slot');

    // ============ Get component IDs ============
    const [urlInputData, buttonData, buttonEventsData, startAsyncData, webRequestData, storeData, writeData] = await Promise.all([
      client.getSlot({ slotId: urlInputSlot.id, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: buttonSlot.id, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: buttonEventsSlot.id, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: startAsyncSlot.id, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: webRequestSlot.id, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: storeSlot.id, depth: 0, includeComponentData: true }),
      client.getSlot({ slotId: writeSlot.id, depth: 0, includeComponentData: true }),
    ]);

    const urlInputComp = urlInputData.data?.components?.find(c => c.componentType?.includes('ValueObjectInput'));
    const boxMesh = buttonData.data?.components?.find(c => c.componentType?.includes('BoxMesh'));
    const meshRenderer = buttonData.data?.components?.find(c => c.componentType?.includes('MeshRenderer'));
    const material = buttonData.data?.components?.find(c => c.componentType?.includes('PBS_Metallic'));
    const physicalButton = buttonData.data?.components?.find(c => c.componentType?.includes('PhysicalButton'));
    const buttonEventsComp = buttonEventsData.data?.components?.find(c => c.componentType?.includes('ButtonEvents') && !c.componentType?.includes('GlobalReference'));
    const globalRefComp = buttonEventsData.data?.components?.find(c => c.componentType?.includes('GlobalReference'));
    const startAsyncComp = startAsyncData.data?.components?.find(c => c.componentType?.includes('StartAsyncTask'));
    const webRequestComp = webRequestData.data?.components?.find(c => c.componentType?.includes('GET_String'));
    const storeComp = storeData.data?.components?.find(c => c.componentType?.includes('DataModelObjectFieldStore'));
    const writeComp = writeData.data?.components?.find(c => c.componentType?.includes('ObjectWrite'));
    // ObjectDisplay is on the same slot as DataModelObjectFieldStore
    const displayComp = storeData.data?.components?.find(c => c.componentType?.includes('ObjectDisplay'));

    if (!urlInputComp?.id || !buttonEventsComp?.id || !globalRefComp?.id || !physicalButton?.id ||
        !startAsyncComp?.id || !webRequestComp?.id || !storeComp?.id || !writeComp?.id || !displayComp?.id) {
      console.log('Components found:', {
        urlInputComp: urlInputComp?.id,
        buttonEventsComp: buttonEventsComp?.id,
        globalRefComp: globalRefComp?.id,
        physicalButton: physicalButton?.id,
        startAsyncComp: startAsyncComp?.id,
        webRequestComp: webRequestComp?.id,
        storeComp: storeComp?.id,
        writeComp: writeComp?.id,
        displayComp: displayComp?.id,
      });
      throw new Error('Failed to find components');
    }
    console.log('  Found component IDs');

    // ============ Set up button appearance ============
    if (meshRenderer?.id && boxMesh?.id && material?.id) {
      await client.updateComponent({
        id: meshRenderer.id,
        members: { Mesh: { $type: 'reference', targetId: boxMesh.id } } as any,
      });

      // 2-step Materials update
      await client.updateComponent({
        id: meshRenderer.id,
        members: { Materials: { $type: 'list', elements: [{ $type: 'reference', targetId: material.id }] } } as any,
      });
      const rendererData = await client.getComponent(meshRenderer.id);
      if (rendererData.success) {
        const materials = (rendererData.data.members as any)?.Materials;
        if (materials?.elements?.[0]) {
          await client.updateComponent({
            id: meshRenderer.id,
            members: { Materials: { $type: 'list', elements: [{ $type: 'reference', id: materials.elements[0].id, targetId: material.id }] } } as any,
          });
        }
      }

      // Green button color
      await client.updateComponent({
        id: material.id,
        members: { AlbedoColor: { $type: 'colorX', value: { r: 0.2, g: 0.8, b: 0.3, a: 1, profile: 'sRGB' } } } as any,
      });
    }
    console.log('  Set up button appearance');

    // ============ Configure ButtonEvents.Button ============

    // Set GlobalReference.Reference to PhysicalButton
    await client.updateComponent({
      id: globalRefComp.id,
      members: { Reference: { $type: 'reference', targetId: physicalButton.id } } as any,
    });
    console.log('  Set GlobalReference.Reference to PhysicalButton');

    // Set ButtonEvents.Button to GlobalReference
    await client.updateComponent({
      id: buttonEventsComp.id,
      members: { Button: { $type: 'reference', targetId: globalRefComp.id } } as any,
    });
    console.log('  Connected ButtonEvents.Button to GlobalReference');

    // ============ Configure components ============

    // Set weather URL
    await client.updateComponent({
      id: urlInputComp.id,
      members: { Value: { $type: 'Uri', value: 'https://wttr.in/Tokyo?format=3' } } as any,
    });
    console.log('  Set weather URL: https://wttr.in/Tokyo?format=3');

    // Connect URL -> WebRequest.URL
    await client.updateComponent({
      id: webRequestComp.id,
      members: { URL: { $type: 'reference', targetId: urlInputComp.id } } as any,
    });
    console.log('  Connected URL input to WebRequest');

    // Get WebRequest details to find Content output ID and OnResponse ID
    const webRequestDetails = await client.getComponent(webRequestComp.id);
    const contentId = (webRequestDetails.data?.members as any)?.Content?.id;
    const onResponseId = (webRequestDetails.data?.members as any)?.OnResponse?.id;

    // Connect ObjectWrite.Value <- GET_String.Content
    if (contentId) {
      await client.updateComponent({
        id: writeComp.id,
        members: { Value: { $type: 'reference', targetId: contentId } } as any,
      });
      console.log('  Connected GET_String.Content to ObjectWrite.Value');
    }

    // Connect ObjectWrite.Variable <- DataModelObjectFieldStore
    await client.updateComponent({
      id: writeComp.id,
      members: { Variable: { $type: 'reference', targetId: storeComp.id } } as any,
    });
    console.log('  Connected DataModelObjectFieldStore to ObjectWrite.Variable');

    // Connect ObjectDisplay.Input <- DataModelObjectFieldStore (reads from persistent store)
    await client.updateComponent({
      id: displayComp.id,
      members: { Input: { $type: 'reference', targetId: storeComp.id } } as any,
    });
    console.log('  Connected DataModelObjectFieldStore to ObjectDisplay.Input');

    // Connect GET_String.OnResponse -> ObjectWrite (impulse)
    if (onResponseId) {
      await client.updateComponent({
        id: webRequestComp.id,
        members: { OnResponse: { $type: 'reference', id: onResponseId, targetId: writeComp.id } } as any,
      });
      console.log('  Connected GET_String.OnResponse to ObjectWrite');
    }

    // Connect ButtonEvents.Pressed -> StartAsyncTask (sync impulse to sync node)
    await client.updateComponent({
      id: buttonEventsComp.id,
      members: { Pressed: { $type: 'reference', targetId: startAsyncComp.id } } as any,
    });
    console.log('  Connected ButtonEvents.Pressed to StartAsyncTask');

    // Connect StartAsyncTask.TaskStart -> GET_String (start async task)
    await client.updateComponent({
      id: startAsyncComp.id,
      members: { TaskStart: { $type: 'reference', targetId: webRequestComp.id } } as any,
    });
    console.log('  Connected StartAsyncTask.TaskStart to GET_String');

    console.log('\n========================================');
    console.log('Weather ProtoFlux created!');
    console.log('========================================');
    console.log(`Location: ${slotName}`);
    console.log('');
    console.log('All connections complete!');
    console.log('Press the green button to fetch weather for Tokyo!');

  } finally {
    client.disconnect();
  }
}

main();
