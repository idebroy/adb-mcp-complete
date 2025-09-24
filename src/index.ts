#!/usr/bin/env node

/**
 * ADB MCP Server
 * --------------
 * 
 * Common tools:
 * - adb-devices: List connected devices
 * - inspect-ui: THE MAIN TOOL to check which app is currently on screen
 * - dump-image: Take a screenshot of the current screen
 * - adb-shell: Run shell commands on the device
 * 
 * Logging:
 * - Default log level is INFO (shows important operations)
 * - For detailed logs, run with: LOG_LEVEL=3 npx adb-mcp
 * - Log levels: 0=ERROR, 1=WARN, 2=INFO, 3=DEBUG
 */

// Import dependencies using require for better compatibility
import { z } from "zod";
import { execFile, ExecFileOptionsWithStringEncoding } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs";
import { join, basename } from "path";
import { tmpdir } from "os";
import { URL } from "url";

// Import MCP SDK using require with type casting to work with our RequestHandlerExtra interface
const McpServerModule = require("@modelcontextprotocol/sdk/server/mcp.js");
const StdioServerTransportModule = require("@modelcontextprotocol/sdk/server/stdio.js");
const McpServer = McpServerModule.McpServer;
const StdioServerTransport = StdioServerTransportModule.StdioServerTransport;

// Import our schemas
import {
  AdbDevicesSchema,
  AdbShellSchema,
  AdbInstallSchema,
  AdbLogcatSchema,
  AdbPullSchema,
  AdbPushSchema,
  AdbScreenshotSchema,
  AdbUidumpSchema,
  AdbActivityManagerSchema,
  AdbPackageManagerSchema,
  RequestHandlerExtra
} from "./types";

// Promisify execFile and fs functions
const execFilePromise = promisify(execFile);
const writeFilePromise = promisify(writeFile);
const unlinkPromise = promisify(unlink);
const readFilePromise = promisify(readFile);

const DEFAULT_EXEC_OPTIONS: ExecFileOptionsWithStringEncoding = {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024
};

type ExecResult = { stdout: string; stderr: string };

async function runAdb(args: string[], options?: ExecFileOptionsWithStringEncoding): Promise<ExecResult> {
  const execOptions: ExecFileOptionsWithStringEncoding = {
    ...DEFAULT_EXEC_OPTIONS,
    ...(options ?? {})
  };
  return execFilePromise("adb", args, execOptions) as Promise<ExecResult>;
}

// ========== Tool Descriptions ==========

/**
 * Tool description for adb-devices
 */
const ADB_DEVICES_TOOL_DESCRIPTION = 
  "Lists all connected Android devices and emulators with their status and details. " +
  "Use this tool to identify available devices for interaction, verify device connections, " +
  "and obtain device identifiers needed for other ADB commands. " +
  "Returns a table of device IDs with connection states (device, offline, unauthorized, etc.). " +
  "Useful before running any device-specific commands to ensure the target device is connected.";

/**
 * Tool description for inspect-ui
 */
const INSPECT_UI_TOOL_DESCRIPTION = 
  "Captures the complete UI hierarchy of the current screen as an XML document. " +
  "This provides structured XML data that can be parsed to identify UI elements and their properties. " +
  "Essential for UI automation, determining current app state, and identifying interactive elements. " +
  "Returns the UI structure including all elements, their IDs, text values, bounds, and clickable states. " +
  "This is significantly more useful than screenshots for AI processing and automation tasks.";

/**
 * Tool description for adb-shell
 */
const ADB_SHELL_TOOL_DESCRIPTION = 
  "Executes a shell command on a connected Android device or emulator. " +
  "Use this for running Android system commands, managing files and permissions, " + 
  "controlling device settings, or interacting with Android components. " +
  "Supports all standard shell commands available on Android (ls, pm, am, settings, etc.). " +
  "Specify a device ID to target a specific device when multiple devices are connected.";

/**
 * Tool description for adb-install
 */
const ADB_INSTALL_TOOL_DESCRIPTION = 
  "Installs an Android application (APK) on a connected device or emulator. " +
  "Use this for deploying applications, testing new builds, or updating existing apps. " +
  "Provide the local path to the APK file for installation. " +
  "Automatically handles the installation process, including replacing existing versions. " +
  "Specify a device ID when working with multiple connected devices.";

/**
 * Tool description for adb-logcat
 */
const ADB_LOGCAT_TOOL_DESCRIPTION = 
  "Retrieves Android system and application logs from a connected device. " +
  "Ideal for debugging app behavior, monitoring system events, and identifying errors. " +
  "Supports filtering by log tags or expressions to narrow down relevant information. " +
  "Results can be limited to a specific number of lines, making it useful for both brief checks and detailed analysis. " +
  "Use when troubleshooting crashes, unexpected behavior, or performance issues.";

/**
 * Tool description for adb-pull
 */
const ADB_PULL_TOOL_DESCRIPTION = 
  "Transfers a file from a connected Android device to the server. " +
  "Use this to retrieve app data files, logs, configurations, or any accessible file from the device. " +
  "The file content can be returned as base64-encoded data or as a success message. " +
  "Requires the full path to the file on the device. " +
  "Useful for data extraction, log collection, and backing up device files.";

/**
 * Tool description for adb-push
 */
const ADB_PUSH_TOOL_DESCRIPTION = 
  "Transfers a file from the server to a connected Android device. " +
  "Useful for uploading test data, configuration files, media content, or any file needed on the device. " +
  "The file must be provided as base64-encoded content. " +
  "Requires specifying the full destination path on the device where the file should be placed. " +
  "Use this when setting up test environments, restoring backups, or modifying device files.";

/**
 * Tool description for dump-image
 */
const ADB_DUMP_IMAGE_TOOL_DESCRIPTION = 
  "Captures the current screen of a connected Android device. " +
  "FOR HUMAN VIEWING ONLY: This tool provides a visual image that cannot be easily processed programmatically. " +
  "The screenshot shows exactly what appears on the device screen at the moment of capture. " +
  "The default behavior returns a success message. Use asBase64=true to get the image as base64-encoded data. " +
  "No additional parameters required beyond an optional device ID. " +
  "Use when you need to visually verify UI elements for human inspection only. " +
  "NOTE: For programmatic analysis or to identify UI elements, use inspect-ui instead.";

/**
 * ADB Server for MCP
 * 
 * This server provides a set of tools to interact with Android devices using ADB.
 * It allows for device management, shell commands, application installation,
 * file transfers, and UI interaction.
 */

// ========== Logging Utilities ==========

/**
 * Simple logging utility with levels
 * 
 * Note: All logs are sent to stderr (console.error) to avoid interfering with 
 * the JSON communication on stdout between the MCP client and server.
 */
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Set log level - can be controlled via environment variable
const LOG_LEVEL = process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO;

function log(level: LogLevel, message: string, ...args: any[]): void {
  if (level <= LOG_LEVEL) {
    const prefix = LogLevel[level] || 'UNKNOWN';
    // Send all logs to stderr to avoid interfering with JSON communication on stdout
    console.error(`[${prefix}] ${message}`, ...args);
  }
}

// ========== Helper Functions ==========

/**
 * Executes an ADB command and handles errors consistently
 * 
 * @param command - The ADB command to execute
 * @param errorMessage - Error message prefix in case of failure
 * @returns Result object with content and optional isError flag
 */
async function executeAdbCommand(args: string[], errorMessage: string) {
  const commandString = ["adb", ...args].join(" ");
  try {
    log(LogLevel.DEBUG, `Executing command: ${commandString}`);
    const { stdout, stderr } = await runAdb(args);
    const stderrText = stderr.trim();

    // Some ADB commands output to stderr but are not errors
    if (stderrText && !stdout.includes("List of devices attached") && !stdout.includes("Success")) {
      const nonErrorWarnings = [
        "Warning: Activity not started, its current task has been brought to the front",
        "Warning: Activity not started, intent has been delivered to currently running top-most instance."
      ];

      if (nonErrorWarnings.some((warning) => stderrText.includes(warning))) {
        log(LogLevel.WARN, `Command warning (not error): ${stderrText}`);
        return {
          content: [{
            type: "text" as const,
            text: stderrText.replace(/^Error: /, "") // Remove any 'Error: ' prefix if present
          }]
          // Do NOT set isError
        };
      }
      log(LogLevel.ERROR, `Command error: ${stderrText}`);
      return {
        content: [{
          type: "text" as const,
          text: `Error: ${stderrText}`
        }],
        isError: true
      };
    }

    log(LogLevel.DEBUG, `Command successful: ${commandString}`);
    const commandSummary = args[0] ? `${args[0]}` : commandString;
    log(LogLevel.INFO, `ADB command executed successfully: ${commandSummary}`);
    return {
      content: [{
        type: "text" as const,
        text: stdout || "Command executed successfully"
      }]
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(LogLevel.ERROR, `${errorMessage}: ${errorMsg}`);
    return {
      content: [{
        type: "text" as const,
        text: `${errorMessage}: ${errorMsg}`
      }],
      isError: true
    };
  }
}

/**
 * Creates a temporary file path
 * 
 * @param prefix - Prefix for the temp file
 * @param filename - Base filename
 * @returns Path to the temporary file
 */
function createTempFilePath(prefix: string, filename: string): string {
  return join(tmpdir(), `${prefix}-${Date.now()}-${basename(filename)}`);
}

/**
 * Safely clean up a temporary file
 * 
 * @param filePath - Path to the temporary file
 */
async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlinkPromise(filePath);
    log(LogLevel.DEBUG, `Cleaned up temp file: ${filePath}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(LogLevel.WARN, `Failed to clean up temp file ${filePath}: ${errorMsg}`);
  }
}

/**
 * Formats a device argument for ADB commands
 * 
 * @param device - Device ID
 * @returns Formatted device argument
 */
function buildDeviceArgs(device?: string): string[] {
  return device ? ["-s", device] : [];
}

function splitCommandArguments(value: string): string[] {
  const args: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escapeNext = false;

  for (const char of value) {
    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escapeNext) {
    current += "\\";
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

// ========== Server Setup ==========

// Create an MCP server
const server = new McpServer({
  name: "ADB MCP Server",
  version: "0.1.0",
  namespace: "adb"
});

// ========== Resources ==========

// Add adb version resource
server.resource(
  "adb-version",
  "adb://version",
  async (uri: URL) => {
    try {
      const { stdout } = await runAdb(["version"]);
      return {
        contents: [{
          uri: uri.href,
          text: stdout
        }]
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(LogLevel.ERROR, `Error retrieving ADB version: ${errorMsg}`);
      return {
        contents: [{
          uri: uri.href,
          text: `Error retrieving ADB version: ${errorMsg}`
        }],
        isError: true
      };
    }
  }
);

// Add device list resource
server.resource(
  "device-list",
  "adb://devices",
  async (uri: URL) => {
    try {
      const { stdout } = await runAdb(["devices", "-l"]);
      return {
        contents: [{
          uri: uri.href,
          text: stdout
        }]
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(LogLevel.ERROR, `Error retrieving device list: ${errorMsg}`);
      return {
        contents: [{
          uri: uri.href,
          text: `Error retrieving device list: ${errorMsg}`
        }],
        isError: true
      };
    }
  }
);

// ========== Tools ==========

// ===== Device Management Tools =====

// Add adb devices tool
server.tool(
  "adb_devices",
  AdbDevicesSchema.shape,
  async (_args: Record<string, never>, _extra: RequestHandlerExtra) => {
    log(LogLevel.INFO, "Listing connected devices");
    return executeAdbCommand(["devices"], "Error executing adb devices");
  },
  { description: ADB_DEVICES_TOOL_DESCRIPTION }
);

// Add adb UI dump tool
server.tool(
  "inspect_ui",
  AdbUidumpSchema.shape,
  async (args: z.infer<typeof AdbUidumpSchema>, _extra: RequestHandlerExtra) => {
    log(LogLevel.INFO, "Dumping UI hierarchy");
    
    const deviceArgs = buildDeviceArgs(args.device);
    const tempFilePath = createTempFilePath("adb-mcp", "window_dump.xml");
    const remotePath = args.outputPath && args.outputPath.trim()
      ? args.outputPath.trim()
      : "/sdcard/window_dump.xml";
    
    try {
      // Dump UI hierarchy on device
      await runAdb([...deviceArgs, "shell", "uiautomator", "dump", remotePath]);
      
      // Pull the UI dump from the device
      await runAdb([...deviceArgs, "pull", remotePath, tempFilePath]);
      
      // Clean up the remote file
      await runAdb([...deviceArgs, "shell", "rm", remotePath]);
      
      // Return the UI dump
      if (args.asBase64 !== false) {
        // Return as base64 (default)
        const xmlData = await readFilePromise(tempFilePath);
        const base64Xml = xmlData.toString('base64');
        
        log(LogLevel.INFO, "UI hierarchy dumped successfully as base64");
        return {
          content: [{ type: "text" as const, text: base64Xml }]
        };
      } else {
        // Return as plain text
        const xmlData = await readFilePromise(tempFilePath, 'utf8');
        
        log(LogLevel.INFO, "UI hierarchy dumped successfully as plain text");
        return {
          content: [{ type: "text" as const, text: xmlData }]
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(LogLevel.ERROR, `Error dumping UI hierarchy: ${errorMsg}`);
      return {
        content: [{ type: "text" as const, text: `Error dumping UI hierarchy: ${errorMsg}` }],
        isError: true
      };
    } finally {
      // Clean up the temporary file
      await cleanupTempFile(tempFilePath);
    }
  },
  { description: INSPECT_UI_TOOL_DESCRIPTION }
);

// Add adb shell tool
server.tool(
  "adb_shell",
  AdbShellSchema.shape,
  async (args: z.infer<typeof AdbShellSchema>, _extra: RequestHandlerExtra) => {
    log(LogLevel.INFO, `Executing shell command: ${args.command}`);
    
    const deviceArgs = buildDeviceArgs(args.device);
    const trimmedCommand = args.command.trim();
    if (!trimmedCommand) {
      const message = "Shell command must not be empty";
      log(LogLevel.ERROR, message);
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true
      };
    }

    return executeAdbCommand([...deviceArgs, "shell", trimmedCommand], "Error executing shell command");
  },
  { description: ADB_SHELL_TOOL_DESCRIPTION }
);

// Add adb install tool
server.tool(
  "adb_install",
  AdbInstallSchema.shape,
  async (args: z.infer<typeof AdbInstallSchema>, _extra: RequestHandlerExtra) => {
    log(LogLevel.INFO, `Installing APK file from path: ${args.apkPath}`);
    
    try {
      // Install the APK using the provided file path
      const deviceArgs = buildDeviceArgs(args.device);
      const apkPath = args.apkPath.trim();
      if (!apkPath) {
        throw new Error("APK path must not be empty");
      }

      const result = await executeAdbCommand([...deviceArgs, "install", "-r", apkPath], "Error installing APK");
      if (!result.isError) {
        log(LogLevel.INFO, "APK installed successfully");
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(LogLevel.ERROR, `Error installing APK: ${errorMsg}`);
      return {
        content: [{ type: "text" as const, text: `Error installing APK: ${errorMsg}` }],
        isError: true
      };
    }
  },
  { description: ADB_INSTALL_TOOL_DESCRIPTION }
);

// Add adb logcat tool
server.tool(
  "adb_logcat",
  AdbLogcatSchema.shape,
  async (args: z.infer<typeof AdbLogcatSchema>, _extra: RequestHandlerExtra) => {
    const lines = args.lines || 50;
    const filterExpr = args.filter ? args.filter : "";
    log(LogLevel.INFO, `Reading logcat (${lines} lines, filter: ${filterExpr || 'none'})`);
    
    const deviceArgs = buildDeviceArgs(args.device);
    const filterArgs = filterExpr ? splitCommandArguments(filterExpr) : [];
    const adbArgs = [...deviceArgs, "logcat", "-d", ...filterArgs];

    try {
      const { stdout, stderr } = await runAdb(adbArgs);
      if (stderr) {
        log(LogLevel.WARN, `logcat returned stderr: ${stderr}`);
      }

      const logLines = stdout.split(/\r?\n/);
      const limitedLines = lines > 0 ? logLines.slice(-lines) : logLines;
      const text = limitedLines.join("\n");

      return {
        content: [{ type: "text" as const, text }]
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(LogLevel.ERROR, `Error reading logcat: ${errorMsg}`);
      return {
        content: [{ type: "text" as const, text: `Error reading logcat: ${errorMsg}` }],
        isError: true
      };
    }
  },
  { description: ADB_LOGCAT_TOOL_DESCRIPTION }
);

// Add adb pull tool
server.tool(
  "adb_pull",
  AdbPullSchema.shape,
  async (args: z.infer<typeof AdbPullSchema>, _extra: RequestHandlerExtra) => {
    log(LogLevel.INFO, `Pulling file from device: ${args.remotePath}`);
    
    const deviceArgs = buildDeviceArgs(args.device);
    const tempFilePath = createTempFilePath("adb-mcp", basename(args.remotePath));
    
    try {
      // Pull the file from the device
      const remotePath = args.remotePath.trim();
      if (!remotePath) {
        throw new Error("Remote path must not be empty");
      }

      const { stdout, stderr } = await runAdb([...deviceArgs, "pull", remotePath, tempFilePath]);
      if (stderr) {
        log(LogLevel.WARN, `adb pull reported stderr: ${stderr}`);
      }
      
      // If asBase64 is true (default), read the file and return as base64
      if (args.asBase64 !== false) {
        const fileData = await readFilePromise(tempFilePath);
        const base64Data = fileData.toString('base64');
        
        log(LogLevel.INFO, `File pulled from device successfully: ${remotePath}`);
        return {
          content: [{ type: "text" as const, text: base64Data }]
        };
      } else {
        // Otherwise return the pull operation result
        log(LogLevel.INFO, `File pulled from device successfully: ${remotePath}`);
        return {
          content: [{ type: "text" as const, text: stdout }]
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(LogLevel.ERROR, `Error pulling file: ${errorMsg}`);
      return {
        content: [{ type: "text" as const, text: `Error pulling file: ${errorMsg}` }],
        isError: true
      };
    } finally {
      // Clean up the temporary file
      await cleanupTempFile(tempFilePath);
    }
  },
  { description: ADB_PULL_TOOL_DESCRIPTION }
);

// Add adb push tool
server.tool(
  "adb_push",
  AdbPushSchema.shape,
  async (args: z.infer<typeof AdbPushSchema>, _extra: RequestHandlerExtra) => {
    log(LogLevel.INFO, `Pushing file to device: ${args.remotePath}`);
    
    const deviceArgs = buildDeviceArgs(args.device);
    const tempFilePath = createTempFilePath("adb-mcp", basename(args.remotePath));
    
    try {
      // Decode the base64 file data and write to temporary file
      const fileData = Buffer.from(args.fileBase64, 'base64');
      await writeFilePromise(tempFilePath, fileData);
      
      // Push the temporary file to the device
      const remotePath = args.remotePath.trim();
      if (!remotePath) {
        throw new Error("Remote path must not be empty");
      }

      const result = await executeAdbCommand([...deviceArgs, "push", tempFilePath, remotePath], "Error pushing file");
      if (!result.isError) {
        log(LogLevel.INFO, `File pushed to device successfully: ${remotePath}`);
      }
      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(LogLevel.ERROR, `Error pushing file: ${errorMsg}`);
      return {
        content: [{ type: "text" as const, text: `Error pushing file: ${errorMsg}` }],
        isError: true
      };
    } finally {
      // Clean up the temporary file
      await cleanupTempFile(tempFilePath);
    }
  },
  { description: ADB_PUSH_TOOL_DESCRIPTION }
);

// Add adb screenshot tool
server.tool(
  "dump_image",
  AdbScreenshotSchema.shape,
  async (args: z.infer<typeof AdbScreenshotSchema>, _extra: RequestHandlerExtra) => {
    log(LogLevel.INFO, "Taking device screenshot");
    
    const deviceArgs = buildDeviceArgs(args.device);
    const tempFilePath = createTempFilePath("adb-mcp", "screenshot.png");
    const remotePath = "/sdcard/screenshot.png";
    
    try {
      // Take screenshot on the device
      await runAdb([...deviceArgs, "shell", "screencap", "-p", remotePath]);
      
      // Pull the screenshot from the device
      await runAdb([...deviceArgs, "pull", remotePath, tempFilePath]);
      
      // Clean up the remote file
      await runAdb([...deviceArgs, "shell", "rm", remotePath]);
      
      // Read the screenshot file
      const imageData = await readFilePromise(tempFilePath);
      
      // Return as base64 or success message based on asBase64 parameter
      if (args.asBase64) {
        const base64Image = imageData.toString('base64');
        log(LogLevel.INFO, "Screenshot captured and converted to base64 successfully");
        return {
          content: [{ type: "text" as const, text: base64Image }]
        };
      } else {
        log(LogLevel.INFO, "Screenshot captured successfully");
        return {
          content: [{ type: "text" as const, text: "Screenshot captured successfully" }]
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(LogLevel.ERROR, `Error taking screenshot: ${errorMsg}`);
      return {
        content: [{ type: "text" as const, text: `Error taking screenshot: ${errorMsg}` }],
        isError: true
      };
    } finally {
      // Clean up the temporary file
      await cleanupTempFile(tempFilePath);
    }
  },
  { description: ADB_DUMP_IMAGE_TOOL_DESCRIPTION }
);

// ===== Activity Manager Tool =====
const ADB_ACTIVITY_MANAGER_TOOL_DESCRIPTION =
  "Executes Activity Manager (am) commands on a connected Android device. " +
  "Supports starting activities, broadcasting intents, force-stopping packages, and other 'am' subcommands. " +
  "Specify the subcommand (e.g. 'start', 'broadcast', 'force-stop') and arguments as you would in adb shell am. " +
  "Example: amCommand='start', amArgs='-a android.intent.action.VIEW -d http://www.example.com'";

server.tool(
  "adb_activity_manager",
  AdbActivityManagerSchema.shape,
  async (args: z.infer<typeof AdbActivityManagerSchema>, _extra: RequestHandlerExtra) => {
    log(LogLevel.INFO, `Executing Activity Manager command: am ${args.amCommand} ${args.amArgs || ''}`);
    const deviceArgs = buildDeviceArgs(args.device);
    const amCommand = args.amCommand.trim();
    if (!amCommand) {
      const message = "Activity Manager command must not be empty";
      log(LogLevel.ERROR, message);
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true
      };
    }

    const additionalArgs = args.amArgs ? splitCommandArguments(args.amArgs) : [];
    return executeAdbCommand([...deviceArgs, "shell", "am", amCommand, ...additionalArgs], "Error executing Activity Manager command");
  },
  { description: ADB_ACTIVITY_MANAGER_TOOL_DESCRIPTION }
);

// ===== Package Manager Tool =====
const ADB_PACKAGE_MANAGER_TOOL_DESCRIPTION =
  "Executes Package Manager (pm) commands on a connected Android device. " +
  "Supports listing packages, installing/uninstalling apps, managing permissions, and other 'pm' subcommands. " +
  "Common commands include: 'list packages', 'install', 'uninstall', 'grant', 'revoke', 'clear', 'enable', 'disable'. " +
  "Example: pmCommand='list', pmArgs='packages -3' (lists third-party packages) or pmCommand='grant', pmArgs='com.example.app android.permission.CAMERA'";

server.tool(
  "adb_package_manager",
  AdbPackageManagerSchema.shape,
  async (args: z.infer<typeof AdbPackageManagerSchema>, _extra: RequestHandlerExtra) => {
    log(LogLevel.INFO, `Executing Package Manager command: pm ${args.pmCommand} ${args.pmArgs || ''}`);
    const deviceArgs = buildDeviceArgs(args.device);
    const pmCommand = args.pmCommand.trim();
    if (!pmCommand) {
      const message = "Package Manager command must not be empty";
      log(LogLevel.ERROR, message);
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true
      };
    }

    const additionalArgs = args.pmArgs ? splitCommandArguments(args.pmArgs) : [];
    return executeAdbCommand([...deviceArgs, "shell", "pm", pmCommand, ...additionalArgs], "Error executing Package Manager command");
  },
  { description: ADB_PACKAGE_MANAGER_TOOL_DESCRIPTION }
);

// ========== Server Startup ==========

// Start receiving messages on stdin and sending messages on stdout
async function runServer(): Promise<void> {
  try {
    log(LogLevel.INFO, "Starting ADB MCP Server...");
    log(LogLevel.INFO, `Current log level: ${LogLevel[LOG_LEVEL]}`);
    log(LogLevel.INFO, "To see more detailed logs, set LOG_LEVEL=3 environment variable");
    
    // Check ADB availability
    try {
      const { stdout } = await runAdb(["version"]);
      log(LogLevel.INFO, `ADB detected: ${stdout.split('\n')[0]}`);
    } catch (error) {
      log(LogLevel.WARN, "ADB not found in PATH. Please ensure Android Debug Bridge is installed and in your PATH.");
    }
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log(LogLevel.INFO, "ADB MCP Server connected and ready");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(LogLevel.ERROR, "Error connecting server:", errorMsg);
    process.exit(1);
  }
}

// Start the server
runServer();
