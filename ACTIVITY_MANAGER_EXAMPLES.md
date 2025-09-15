# Activity Manager (am) Commands Examples

The `adb_activity_manager` tool allows you to execute various Activity Manager commands on Android devices. Here are common usage examples:

## Starting Activities

### Launch the home screen
```json
{
  "amCommand": "start",
  "amArgs": "-a android.intent.action.MAIN -c android.intent.category.HOME"
}
```

### Open a specific app by package name
```json
{
  "amCommand": "start",
  "amArgs": "-n com.example.app/.MainActivity"
}
```

### Open a URL in the default browser
```json
{
  "amCommand": "start",
  "amArgs": "-a android.intent.action.VIEW -d https://www.example.com"
}
```

### Start an activity with debugging enabled
```json
{
  "amCommand": "start",
  "amArgs": "-D -n com.example.app/.MainActivity"
}
```

### Start an activity and wait for launch completion
```json
{
  "amCommand": "start",
  "amArgs": "-W -n com.example.app/.MainActivity"
}
```

### Start activity with profiling
```json
{
  "amCommand": "start",
  "amArgs": "--start-profiler /sdcard/profile.trace -n com.example.app/.MainActivity"
}
```

### Start as a specific user
```json
{
  "amCommand": "start",
  "amArgs": "--user 0 -n com.example.app/.MainActivity"
}
```

## Managing Services

### Start a service
```json
{
  "amCommand": "startservice",
  "amArgs": "-n com.example.app/.MyService"
}
```

### Start a service with intent extras
```json
{
  "amCommand": "startservice",
  "amArgs": "-n com.example.app/.MyService --es key value"
}
```

## Process Management

### Force stop an application
```json
{
  "amCommand": "force-stop",
  "amArgs": "com.example.app"
}
```

### Kill specific processes for an app
```json
{
  "amCommand": "kill",
  "amArgs": "com.example.app"
}
```

### Kill all background processes
```json
{
  "amCommand": "kill-all"
}
```

### Kill processes for a specific user
```json
{
  "amCommand": "kill",
  "amArgs": "--user 0 com.example.app"
}
```

## Broadcasting Intents

### Send a simple broadcast
```json
{
  "amCommand": "broadcast",
  "amArgs": "-a com.example.CUSTOM_ACTION"
}
```

### Broadcast with data and extras
```json
{
  "amCommand": "broadcast",
  "amArgs": "-a android.intent.action.BATTERY_CHANGED --ei level 50"
}
```

### Broadcast to all users
```json
{
  "amCommand": "broadcast",
  "amArgs": "--user all -a com.example.CUSTOM_ACTION"
}
```

### Broadcast to specific user
```json
{
  "amCommand": "broadcast",
  "amArgs": "--user 0 -a com.example.CUSTOM_ACTION"
}
```

## Testing and Instrumentation

### Run instrumentation tests
```json
{
  "amCommand": "instrument",
  "amArgs": "-w -r com.example.app.test/androidx.test.runner.AndroidJUnitRunner"
}
```

### Run tests with specific parameters
```json
{
  "amCommand": "instrument",
  "amArgs": "-w -r -e debug false com.example.app.test/androidx.test.runner.AndroidJUnitRunner"
}
```

### Run tests with profiling
```json
{
  "amCommand": "instrument",
  "amArgs": "-w -p /sdcard/profile.trace com.example.app.test/androidx.test.runner.AndroidJUnitRunner"
}
```

### Disable window animations during testing
```json
{
  "amCommand": "instrument",
  "amArgs": "--no-window-animation -w com.example.app.test/androidx.test.runner.AndroidJUnitRunner"
}
```

## Profiling

### Start profiling a process
```json
{
  "amCommand": "profile",
  "amArgs": "start com.example.app /sdcard/profile.trace"
}
```

### Stop profiling a process
```json
{
  "amCommand": "profile",
  "amArgs": "stop com.example.app"
}
```

### Dump heap information
```json
{
  "amCommand": "dumpheap",
  "amArgs": "com.example.app /sdcard/heap.hprof"
}
```

### Dump native heap
```json
{
  "amCommand": "dumpheap",
  "amArgs": "-n com.example.app /sdcard/native_heap.txt"
}
```

### Dump heap for specific user
```json
{
  "amCommand": "dumpheap",
  "amArgs": "--user 0 com.example.app /sdcard/heap.hprof"
}
```

### Dump bitmaps (API 35+)
```json
{
  "amCommand": "dumpbitmaps",
  "amArgs": "-d png -p com.example.app"
}
```

## Debugging

### Set debug app
```json
{
  "amCommand": "set-debug-app",
  "amArgs": "-w com.example.app"
}
```

### Set persistent debug app
```json
{
  "amCommand": "set-debug-app",
  "amArgs": "-w --persistent com.example.app"
}
```

### Clear debug app
```json
{
  "amCommand": "clear-debug-app"
}
```

### Start crash/ANR monitoring
```json
{
  "amCommand": "monitor",
  "amArgs": "--gdb"
}
```

## Display Management

### Change display size
```json
{
  "amCommand": "display-size",
  "amArgs": "1280x720"
}
```

### Reset display size
```json
{
  "amCommand": "display-size",
  "amArgs": "reset"
}
```

### Change display density
```json
{
  "amCommand": "display-density",
  "amArgs": "480"
}
```

### Control screen compatibility mode
```json
{
  "amCommand": "screen-compat",
  "amArgs": "on com.example.app"
}
```

## Intent Utilities

### Convert intent to URI format
```json
{
  "amCommand": "to-uri",
  "amArgs": "-a android.intent.action.VIEW -d https://www.example.com"
}
```

### Convert intent to intent: URI format
```json
{
  "amCommand": "to-intent-uri",
  "amArgs": "-a android.intent.action.VIEW -d https://www.example.com"
}
```

## Common Intent Flags and Extras

### Intent flags (use with -f)
- `0x10000000` - FLAG_ACTIVITY_NEW_TASK
- `0x20000000` - FLAG_ACTIVITY_SINGLE_TOP
- `0x04000000` - FLAG_ACTIVITY_CLEAR_TOP
- `0x40000000` - FLAG_ACTIVITY_CLEAR_TASK

### Intent extras (examples)
- `--es key value` - String extra
- `--ei key 123` - Integer extra
- `--ez key true` - Boolean extra
- `--el key 123456789` - Long extra
- `--ef key 1.23` - Float extra
- `--eu key https://example.com` - URI extra

## Using with Specific Device

To target a specific device when multiple devices are connected:

```json
{
  "amCommand": "start",
  "amArgs": "-a android.intent.action.MAIN -c android.intent.category.HOME",
  "device": "emulator-5554"
}
```

## Common Error Scenarios

1. **Activity not found**: Verify package name and activity class
2. **Permission denied**: Some operations require specific permissions
3. **Security exception**: Certain broadcasts may be restricted
4. **Device offline**: Verify device connection with `adb_devices`

## Tips

- Use `-W` flag to wait for activity launch completion for debugging
- Combine multiple flags and extras as needed
- Test broadcast intents carefully to avoid unintended side effects
- Use force-stop to cleanly terminate misbehaving applications
- Profile long enough to capture meaningful data but not too long to fill storage
