/**
 * Type definitions for the ADB MCP Server
 */

import { z } from 'zod';

// RequestHandlerExtra interface for MCP SDK
export interface RequestHandlerExtra {
  uri: URL;
  [key: string]: unknown;
}

/**
 * Response type for command execution
 */
export interface CommandResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

/**
 * Resource response format
 */
export interface ResourceResponse {
  contents: Array<{ uri: string; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

/**
 * Log levels enum
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Schema definitions for tool inputs
export const adbDevicesInputSchema = {
  random_string: z.string().optional()
};

export const adbShellInputSchema = {
  command: z.string().describe("Shell command to execute on the device"),
  device: z.string().optional().describe("Specific device ID (optional)")
};

export const adbInstallInputSchema = {
  apkPath: z.string().describe("Local path to the APK file"),
  device: z.string().optional().describe("Specific device ID (optional)")
};

export const adbLogcatInputSchema = {
  filter: z.string().optional().describe("Logcat filter expression (optional)"),
  device: z.string().optional().describe("Specific device ID (optional)"),
  lines: z.number().optional().default(50).describe("Number of lines to return (default: 50)")
};

export const adbPullInputSchema = {
  remotePath: z.string().describe("Remote file path on the device"),
  device: z.string().optional().describe("Specific device ID (optional)"),
  asBase64: z.boolean().optional().default(true).describe("Return file content as base64 (default: true)")
};

export const adbPushInputSchema = {
  fileBase64: z.string().describe("Base64 encoded file content to push"),
  remotePath: z.string().describe("Remote file path on the device"),
  device: z.string().optional().describe("Specific device ID (optional)")
};

export const dumpImageInputSchema = {
  device: z.string().optional().describe("Specific device ID (optional)"),
  asBase64: z.boolean().optional().default(false).describe("Return image as base64 (default: false)")
};

export const inspectUiInputSchema = {
  device: z.string().optional().describe("Specific device ID (optional)"),
  outputPath: z.string().optional().describe("Custom output path on device (default: /sdcard/window_dump.xml)"),
  asBase64: z.boolean().optional().default(false).describe("Return XML content as base64 (default: false)")
};

// Activity Manager tool schema
export const adbActivityManagerSchema = z.object({
  amCommand: z.string().describe("Activity Manager subcommand, e.g. 'start', 'broadcast', 'force-stop', etc."),
  amArgs: z.string().optional().describe("Arguments for the am subcommand, e.g. '-a android.intent.action.VIEW'"),
  device: z.string().optional().describe("Specific device ID (optional)")
});

// Package Manager tool schema
export const adbPackageManagerSchema = z.object({
  pmCommand: z.string().describe("Package Manager subcommand, e.g. 'list', 'install', 'uninstall', 'grant', 'revoke', etc."),
  pmArgs: z.string().optional().describe("Arguments for the pm subcommand, e.g. 'packages', 'com.example.app android.permission.CAMERA'"),
  device: z.string().optional().describe("Specific device ID (optional)")
});



// Zod schema objects
export const AdbDevicesSchema = z.object(adbDevicesInputSchema);
export const AdbShellSchema = z.object(adbShellInputSchema);
export const AdbInstallSchema = z.object(adbInstallInputSchema);
export const AdbLogcatSchema = z.object(adbLogcatInputSchema);
export const AdbPullSchema = z.object(adbPullInputSchema);
export const AdbPushSchema = z.object(adbPushInputSchema);
export const AdbScreenshotSchema = z.object(dumpImageInputSchema);
export const AdbUidumpSchema = z.object(inspectUiInputSchema);
export const AdbActivityManagerSchema = adbActivityManagerSchema;
export const AdbPackageManagerSchema = adbPackageManagerSchema;

// Input type definitions
export type AdbDevicesInput = z.infer<typeof AdbDevicesSchema>;
export type AdbShellInput = z.infer<typeof AdbShellSchema>;
export type AdbInstallInput = z.infer<typeof AdbInstallSchema>;
export type AdbLogcatInput = z.infer<typeof AdbLogcatSchema>;
export type AdbPullInput = z.infer<typeof AdbPullSchema>;
export type AdbPushInput = z.infer<typeof AdbPushSchema>;
export type AdbScreenshotInput = z.infer<typeof AdbScreenshotSchema>;
export type AdbUidumpInput = z.infer<typeof AdbUidumpSchema>; 
export type AdbActivityManagerInput = z.infer<typeof AdbActivityManagerSchema>;
export type AdbPackageManagerInput = z.infer<typeof AdbPackageManagerSchema>;