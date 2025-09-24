# Package Manager (pm) Commands Examples

The `adb_package_manager` tool allows you to execute various Package Manager commands on Android devices. Here are common usage examples:

## Listing Packages

### List all packages
```json
{
  "pmCommand": "list",
  "pmArgs": "packages"
}
```

### List only third-party (user-installed) packages
```json
{
  "pmCommand": "list",
  "pmArgs": "packages -3"
}
```

### List only system packages
```json
{
  "pmCommand": "list",
  "pmArgs": "packages -s"
}
```

### List only enabled packages
```json
{
  "pmCommand": "list",
  "pmArgs": "packages -e"
}
```

### List only disabled packages
```json
{
  "pmCommand": "list",
  "pmArgs": "packages -d"
}
```

### List packages with their APK file paths
```json
{
  "pmCommand": "list",
  "pmArgs": "packages -f"
}
```

## Managing Permissions

### Grant a permission to an app
```json
{
  "pmCommand": "grant",
  "pmArgs": "com.example.app android.permission.CAMERA"
}
```

### Revoke a permission from an app
```json
{
  "pmCommand": "revoke",
  "pmArgs": "com.example.app android.permission.CAMERA"
}
```

### List all permissions
```json
{
  "pmCommand": "list",
  "pmArgs": "permissions"
}
```

### List permissions by group
```json
{
  "pmCommand": "list",
  "pmArgs": "permissions -g"
}
```

### List dangerous permissions only
```json
{
  "pmCommand": "list",
  "pmArgs": "permissions -d"
}
```

## App Management

### Get the path to an app's APK
```json
{
  "pmCommand": "path",
  "pmArgs": "com.example.app"
}
```

### Clear an app's data and cache
```json
{
  "pmCommand": "clear",
  "pmArgs": "com.example.app"
}
```

### Enable an app or component
```json
{
  "pmCommand": "enable",
  "pmArgs": "com.example.app"
}
```

### Disable an app or component
```json
{
  "pmCommand": "disable",
  "pmArgs": "com.example.app"
}
```

### Uninstall an app (keeping data)
```json
{
  "pmCommand": "uninstall",
  "pmArgs": "-k com.example.app"
}
```

### Uninstall an app completely
```json
{
  "pmCommand": "uninstall",
  "pmArgs": "com.example.app"
}
```

## System Information

### List installed libraries
```json
{
  "pmCommand": "list",
  "pmArgs": "libraries"
}
```

### List device features
```json
{
  "pmCommand": "list",
  "pmArgs": "features"
}
```

### List permission groups
```json
{
  "pmCommand": "list",
  "pmArgs": "permission-groups"
}
```

### List users on the device
```json
{
  "pmCommand": "list",
  "pmArgs": "users"
}
```

## Installation Management

### Install an APK (alternative to adb_install)
```json
{
  "pmCommand": "install",
  "pmArgs": "/path/to/app.apk"
}
```

### Install with specific options
```json
{
  "pmCommand": "install",
  "pmArgs": "-r -t /path/to/app.apk"
}
```

### Get current install location setting
```json
{
  "pmCommand": "get-install-location"
}
```

### Set install location (0=auto, 1=internal, 2=external)
```json
{
  "pmCommand": "set-install-location",
  "pmArgs": "0"
}
```

## Advanced Features

### Trim cache files to free space
```json
{
  "pmCommand": "trim-caches",
  "pmArgs": "1000000"
}
```

### Get app link verification state
```json
{
  "pmCommand": "get-app-links",
  "pmArgs": "com.example.app"
}
```

### Reset app link verification
```json
{
  "pmCommand": "reset-app-links",
  "pmArgs": "com.example.app"
}
```

## Using with Specific Device

To target a specific device when multiple devices are connected:

```json
{
  "pmCommand": "list",
  "pmArgs": "packages -3",
  "device": "emulator-5554"
}
```

## Common Error Scenarios

1. **Permission denied**: Some commands require root access
2. **Package not found**: Verify package name with `list packages`
3. **Invalid permission**: Check available permissions with `list permissions`
4. **Device offline**: Verify device connection with `adb_devices`

## Tips

- Use `list packages | grep packagename` pattern in pmArgs to filter results
- Some operations may require elevated permissions
- Always verify package names before performing destructive operations
- Test permission changes with caution as they affect app functionality
