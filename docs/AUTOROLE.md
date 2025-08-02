# DisTrack Discord Bot - Auto-Role System

## 🎭 Auto-Role Feature Overview

The auto-role system automatically assigns roles to new members when they join your Discord server. This feature supports separate roles for regular users and bots, with comprehensive configuration options.

## ✨ Key Features

- **Automatic Role Assignment**: Instantly assigns roles to new members
- **Separate Bot Roles**: Configure different roles for bots vs regular users
- **Admin-Only Management**: All configuration requires Administrator permissions
- **Safety Checks**: Validates role hierarchy and permissions
- **Database Persistence**: Settings are stored in MongoDB
- **Real-time Configuration**: Enable/disable without restarting the bot
- **Test Functionality**: Test the system before going live

## 🚀 Quick Start

### 1. Set Up Auto-Role
```
/autorole set role:@MemberRole
```
This sets the role for new members and automatically enables the system.

### 2. Optional: Configure Bot Role
```
/autorole set role:@MemberRole bot-role:@BotRole
```
Set separate roles for regular users and bots.

### 3. Check Status
```
/autorole status
```
View current configuration and status.

## 📋 Available Commands

### `/autorole set`
Configure the auto-role system.

**Parameters:**
- `role` (required): Role to assign to new members
- `bot-role` (optional): Role to assign to new bots

**Example:**
```
/autorole set role:@Member bot-role:@Bot
```

### `/autorole enable`
Enable auto-role assignment.

**Usage:**
```
/autorole enable
```

### `/autorole disable`
Disable auto-role assignment.

**Usage:**
```
/autorole disable
```

### `/autorole status`
Show current auto-role configuration.

**Usage:**
```
/autorole status
```

### `/autorole test`
Test auto-role assignment on yourself.

**Usage:**
```
/autorole test
```

## ⚙️ Configuration Details

### Role Requirements

1. **Bot Permissions**: The bot must have the "Manage Roles" permission
2. **Role Hierarchy**: The bot's highest role must be above the auto-role
3. **Role Type**: Cannot assign managed roles (Nitro booster, bot roles, etc.)

### Automatic Behavior

- **New Members**: Receive the configured member role
- **New Bots**: Receive the bot role (if configured) or no role
- **Failed Assignments**: Logged for administrators to review

## 🔒 Security Features

- **Permission Validation**: Multiple layers of permission checking
- **Role Hierarchy Checks**: Prevents assigning roles above bot's position
- **Admin-Only Access**: All commands require Administrator permission
- **Safe Defaults**: Conservative error handling prevents abuse

## 🛠️ Technical Implementation

### Database Schema
The auto-role configuration is stored in the `GuildConfig` collection:

```javascript
autoRoleConfig: {
    enabled: Boolean,     // Whether auto-role is active
    roleId: String,       // Role ID for regular members
    botRoleId: String,    // Role ID for bots (optional)
}
```

### Event Handling
The system uses Discord.js `GuildMemberAdd` event to detect new members and automatically assign roles based on the configuration.

## 🐛 Troubleshooting

### Common Issues

**"I cannot assign this role"**
- Check if the bot's role is higher than the auto-role
- Ensure the bot has "Manage Roles" permission

**"Role is managed by Discord"**
- Cannot assign Nitro booster, integration, or bot roles
- Choose a regular server role instead

**Role not being assigned**
- Check if auto-role is enabled: `/autorole status`
- Verify role still exists in the server
- Check bot permissions and role hierarchy

### Logging
All auto-role activities are logged with timestamps:
- Member joins and role assignments
- Configuration changes
- Errors and warnings

## 📊 Best Practices

1. **Role Hierarchy**: Place the bot's role above auto-roles
2. **Permission Management**: Give auto-roles appropriate server permissions
3. **Testing**: Use `/autorole test` before enabling
4. **Monitoring**: Check logs for any assignment failures
5. **Regular Maintenance**: Verify role configuration periodically

## 🔄 Integration with Other Features

The auto-role system integrates seamlessly with:
- **Moderation System**: Works alongside kick/ban/timeout commands
- **Ticket System**: New members can immediately create tickets
- **Welcome Messages**: Complements welcome channel setups

## 📝 Examples

### Basic Setup
```
# Set member role and enable
/autorole set role:@Member

# Check it worked
/autorole status
```

### Advanced Setup with Bot Role
```
# Configure both member and bot roles
/autorole set role:@Member bot-role:@Bot

# Test the assignment
/autorole test

# View current config
/autorole status
```

### Managing the System
```
# Temporarily disable
/autorole disable

# Re-enable later
/autorole enable

# Change the role
/autorole set role:@NewMemberRole
```

## 🎯 Use Cases

- **Community Servers**: Automatically give access to basic channels
- **Gaming Servers**: Assign game-specific roles to new players  
- **Study Groups**: Give access to study materials and channels
- **Business Servers**: Assign employee or visitor roles
- **Bot Management**: Separate roles for bots vs real users

The auto-role system provides a robust, secure, and user-friendly way to manage automatic role assignment in your Discord server!
