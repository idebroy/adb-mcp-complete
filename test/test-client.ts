import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from "assert";

/**
 * ADB MCP Test Client
 * 
 * This test script verifies the functionality of the ADB MCP server by 
 * making real calls to its tools and validating the responses.
 * 
 * Prerequisites:
 * - An Android device or emulator must be connected
 * - The project must be built (run 'npm run build' first)
 * 
 * The tests exercise multiple ADB functionalities including:
 * - Device detection
 * - Screenshot capture
 * - UI hierarchy inspection
 * - Shell command execution
 */

// Define interfaces for MCP tool responses
interface ToolResponse {
  content?: Array<{ type: string; text?: string }>;
  [key: string]: any;
}

async function main(): Promise<void> {
  try {
    // Create a transport that spawns the server process
    const transport = new StdioClientTransport({
      command: "node",
      args: ["./dist/index.js"]
    });
    
    // Create a client
    const client = new Client({
      name: "ADB MCP Test Client",
      version: "1.0.0"
    });
    
    // Connect to the server
    await client.connect(transport);
    console.log("✅ Connected to ADB MCP server");
    
    // Get device list
    console.log("\n=== Testing adb_devices ===");
    const devicesResult = await client.callTool({
      name: "adb_devices",
      arguments: {}
    }) as ToolResponse;
    console.log(devicesResult);
    
    // Assert device list response
    assert(devicesResult.content, "Expected content in device list response");
    assert(Array.isArray(devicesResult.content), "Expected content to be an array");
    assert(devicesResult.content.length > 0, "Expected at least one content item in device list");
    const deviceListText = devicesResult.content[0]?.text || '';
    assert(deviceListText.includes("List of devices attached"), "Expected device list header");
    console.log("✅ Device list response validated");
    
    // Test the screenshot tool with default (non-base64) behavior
    console.log("\n=== Testing dump_image (default non-base64) ===");
    const screenshotDefaultResult = await client.callTool({
      name: "dump_image",
      arguments: {}
    }) as ToolResponse;
    
    console.log("Screenshot result (default):");
    console.log(screenshotDefaultResult);
    
    // Assert default screenshot response
    assert(screenshotDefaultResult.content, "Expected content in default screenshot response");
    assert(Array.isArray(screenshotDefaultResult.content), "Expected content to be an array");
    assert(screenshotDefaultResult.content.length > 0, "Expected at least one content item");
    assert(!screenshotDefaultResult.isError, "Expected no error in default screenshot response");
    assert(screenshotDefaultResult.content[0]?.text?.includes("Screenshot captured"), 
           "Expected success message in default screenshot response");
    console.log("✅ Default screenshot response validated");
    
    // Test the screenshot tool with explicit base64 request
    console.log("\n=== Testing dump_image (explicit base64) ===");
    const screenshotBase64Result = await client.callTool({
      name: "dump_image",
      arguments: {
        asBase64: true
      }
    }) as ToolResponse;
    
    console.log("Screenshot result (base64):");
    const base64Content = screenshotBase64Result.content?.[0]?.text || '';
    console.log(`Received base64 data of length: ${base64Content.length}`);
    if (base64Content.length > 100) {
      console.log(`First 100 characters: ${base64Content.substring(0, 100)}...`);
    }
    
    // Assert base64 screenshot response
    assert(screenshotBase64Result.content, "Expected content in base64 screenshot response");
    assert(Array.isArray(screenshotBase64Result.content), "Expected content to be an array");
    assert(screenshotBase64Result.content.length > 0, "Expected at least one content item");
    assert(!screenshotBase64Result.isError, "Expected no error in base64 screenshot response");
    assert(base64Content.length > 1000, "Expected substantial base64 data in response");
    assert(/^[A-Za-z0-9+/=]+$/.test(base64Content), "Expected valid base64 characters");
    assert(base64Content.startsWith("iVBOR"), "Expected PNG image data signature");
    console.log("✅ Base64 screenshot response validated");
    
    // Test the UI dump tool
    console.log("\n=== Testing inspect_ui ===");
    const uidumpResult = await client.callTool({
      name: "inspect_ui",
      arguments: {
        asBase64: false
      }
    }) as ToolResponse;
    
    console.log("Raw response:");
    console.log(uidumpResult);
    
    // Assert UI dump response
    assert(uidumpResult.content, "Expected content in UI dump response");
    assert(Array.isArray(uidumpResult.content), "Expected content to be an array");
    assert(uidumpResult.content.length > 0, "Expected at least one content item");
    
    // Check if we got base64 data or direct XML
    const firstContent = uidumpResult.content[0]?.text || '';
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(firstContent) && 
                    firstContent.length % 4 === 0 && 
                    firstContent.length > 100;
    
    if (isBase64) {
      console.log("\nDetected base64 encoded data, decoding...");
      try {
        const decodedXml = Buffer.from(firstContent, 'base64').toString('utf8');
        console.log("\nFirst 200 characters of decoded XML:");
        console.log(decodedXml.substring(0, 200) + "...");
        
        // Assert decoded XML
        assert(decodedXml.trim().startsWith("<?xml"), "Expected XML declaration in decoded content");
        assert(decodedXml.includes("<hierarchy"), "Expected hierarchy tag in XML");
        console.log("✅ UI dump base64 response validated");
      } catch (error) {
        console.error("Error decoding base64:", error);
        assert.fail("Failed to decode base64 UI dump data");
      }
    } else {
      console.log("\nFirst 200 characters of XML (not base64):");
      console.log(firstContent.substring(0, 200) + "...");
      
      // Assert direct XML
      assert(!uidumpResult.isError, "Expected no error in UI dump response");
      assert(firstContent.trim().startsWith("<?xml"), "Expected XML declaration");
      assert(firstContent.includes("<hierarchy"), "Expected hierarchy tag in XML");
      console.log("✅ UI dump XML response validated");
    }
    
    // Test adb_shell
    console.log("\n=== Testing adb_shell ===");
    const shellResult = await client.callTool({
      name: "adb_shell",
      arguments: {
        command: "echo 'Test command execution'"
      }
    }) as ToolResponse;
    
    console.log("Shell command result:");
    console.log(shellResult);
    
    // Assert shell command response
    assert(shellResult.content, "Expected content in shell command response");
    assert(Array.isArray(shellResult.content), "Expected content to be an array");
    assert(shellResult.content.length > 0, "Expected at least one content item");
    assert(!shellResult.isError, "Expected no error in shell command response");
    const shellOutput = shellResult.content[0]?.text || '';
    assert(shellOutput.includes("Test command execution"), "Expected echo output in shell response");
    console.log("✅ Shell command response validated");

    // Test adb_activity_manager 
    // make sure the home screen is not visible before running this test
    console.log("\n=== Testing adb_activity_manager (am start HOME) ===");
    const amResult = await client.callTool({
      name: "adb_activity_manager",
      arguments: {
        amCommand: "start",
        amArgs: "-a android.intent.action.MAIN -c android.intent.category.HOME"
        // device: undefined // Optionally specify device
      }
    }) as ToolResponse;

    console.log("Activity Manager result:");
    console.log(amResult);

    // Assert Activity Manager response
    assert(amResult.content, "Expected content in Activity Manager response");
    assert(Array.isArray(amResult.content), "Expected content to be an array");
    assert(amResult.content.length > 0, "Expected at least one content item");
    assert(!amResult.isError, "Expected no error in Activity Manager response");
    const amOutput = amResult.content[0]?.text || '';
    assert(amOutput.length > 0, "Expected some output from Activity Manager");
    console.log("✅ Activity Manager response validated");
    
    // Test adb_package_manager 
    console.log("\n=== Testing adb_package_manager (pm list packages) ===");
    const pmResult = await client.callTool({
      name: "adb_package_manager",
      arguments: {
        pmCommand: "list",
        pmArgs: "packages -3"
        // device: undefined // Optionally specify device
      }
    }) as ToolResponse;

    console.log("Package Manager result:");
    console.log(pmResult);

    // Assert Package Manager response
    assert(pmResult.content, "Expected content in Package Manager response");
    assert(Array.isArray(pmResult.content), "Expected content to be an array");
    assert(pmResult.content.length > 0, "Expected at least one content item");
    assert(!pmResult.isError, "Expected no error in Package Manager response");
    const pmOutput = pmResult.content[0]?.text || '';
    assert(pmOutput.length > 0, "Expected some output from Package Manager");
    // Third-party packages list should contain package names
    assert(pmOutput.includes("package:") || pmOutput.includes("No packages found") || pmOutput.length === 0, 
           "Expected package list format or empty result");
    console.log("✅ Package Manager response validated");
    
    // Cleanup
    await client.close();
    console.log("\n✅ All tests passed - Disconnected from ADB MCP server");
    
  } catch (error) {
    console.error("❌ Test failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 