<div align=center>
<!-- Add Image -->
    
# DisTrack Discord Bot - Server Management

A comprehensive Discord server management bot with admin-only moderation commands and a complete ticketing system.



| Name | Description | Version | Links
| --- | --- | --- | --- |
| VSCode Extension | Discord VSCode Leaderboard Tracker Extension | ![Latest Release](https://img.shields.io/github/v/release/JayNightmare/DisTrack-VSCode-Extension?label=Latest%20Release) | [GitHub](https://github.com/JayNightmare/DisTrack-VSCode-Extension), [Marketplace](https://marketplace.visualstudio.com/items?itemName=JayNightmare.dis-track) |
| Discord Bot | Discord Bot for tracking coding activity | ![Latest Release](https://img.shields.io/github/v/release/JayNightmare/DisTrack-Discord-Bot?label=Latest%20Release) | [GitHub](https://github.com/JayNightmare/DisTrack-Discord-Bot), [Invite](https://discord.com/oauth2/authorize?client_id=1305258645906526328) |
| Discord Manager | Discord bot which manages the Discord server | ![Latest Release](https://img.shields.io/github/v/release/JayNightmare/DisTrack-Discord-Bot-Management?label=Latest%20Release) | [GitHub](https://github.com/JayNightmare/DisTrack-Discord-Bot-Management)
| Website | Website for DisTrack | ![Latest Release](https://img.shields.io/github/v/release/JayNightmare/DisTrack-Website?label=Latest%20Release) | [GitHub](https://github.com/JayNightmare/DisTrack-Website), [Website](https://distrack.endpoint-system.uk/) |
| Backend Endpoints | API Endpoints for business logic | ![Latest Release](https://img.shields.io/github/v/release/JayNightmare/DisTrack-Backend-Endpoint-Server?label=Latest%20Release) | [GitHub](https://github.com/JayNightmare/DisTrack-Backend-Endpoint-Server)
| Frontend Endpoints | Bot Crawler Rich Embed logic | ![Latest Release](https://img.shields.io/github/v/release/JayNightmare/DisTrack-Frontend-Endpoint-Server?label=Latest%20Release) | [GitHub](https://github.com/JayNightmare/DisTrack-Frontend-Endpoint-Server)

</div>

## 🚀 Features

### 🔒 **Admin-Only Security**
- All moderation commands are restricted to users with Administrator permissions
- Slash commands are invisible to non-admin users
- Multiple layers of permission validation

### 🛡️ **Moderation Commands**
- `/kick` - Kick members from the server
- `/timeout` - Timeout members with flexible duration (1s - 28d)
- `/remove-timeout` - Remove timeout from members
- `/ban` - Ban members with optional message deletion
- `/unban` - Unban users by ID

### 🎫 **Advanced Ticketing System**
- Interactive ticket creation with category selection
- Multiple ticket categories (Support, Bug Report, Feature Request, Appeals)
- Staff-only ticket management commands
- Automatic channel permissions and organization
- Ticket status tracking (Open, Closed, Archived)
- Database persistence with MongoDB

### 📊 **Management Features**
- `/ticket-panel` - Create interactive ticket creation panels
- `/ticket-list` - List and filter tickets
- `/ticket-close` - Close tickets with logging
- `/ticket-delete` - Archive and delete ticket channels
- `/help` - Comprehensive help system
- `/ping` - Bot status and latency checking

## 🏗️ **Architecture**

### Modular Design
```
├── bot.js                 # Main bot entry point
├── config/
│   └── config.js         # Centralized configuration
├── commands/
│   ├── moderation/       # Moderation commands
│   ├── tickets/          # Ticket system commands
│   └── general/          # General purpose commands
├── events/
│   └── EventHandler.js   # Event management
├── handlers/
│   └── TicketHandler.js  # Ticket interaction handling
├── models/
│   ├── Ticket.js         # Ticket database schema
│   └── GuildConfig.js    # Guild configuration schema
└── utils/
    ├── Utils.js          # Utility functions
    ├── CommandLoader.js  # Dynamic command loading
    └── CommandDeployer.js # Slash command deployment
```

### Database Schema
- **Tickets**: Store ticket information, messages, and status
- **Guild Config**: Per-server configuration and settings
- **MongoDB**: Reliable data persistence with automatic reconnection

## 🛠️ **Setup Instructions**

### Prerequisites
- Node.js 16.9.0 or higher
- MongoDB database (local or MongoDB Atlas)
- Discord Bot Token and Application ID

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Update `.env` file with your credentials:
   ```env
   TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_application_id
   MONGODB_URI=your_mongodb_connection_string
   OWNER_ID=your_discord_user_id
   PORT=7070
   NODE_ENV=production
   ```

3. **Deploy Slash Commands**
   ```bash
   # Deploy globally (production)
   npm run deploy
   
   # Deploy to specific guild for testing
   npm run deploy-guild <guild_id>
   ```

4. **Start the Bot**
   ```bash
   # Production
   npm start
   
   # Development with auto-restart
   npm run dev
   ```

## 🎯 **Usage Guide**

### For Server Administrators

1. **Set Up Ticket System**
   - Use `/ticket-panel` to create a ticket creation interface
   - Users can click the button to create tickets with category selection

2. **Moderate Your Server**
   - Use moderation commands with proper reasons for logging
   - All actions are logged and can include optional reasoning

3. **Manage Tickets**
   - Use `/ticket-list` to see all active tickets
   - Close tickets with `/ticket-close` when resolved
   - Delete old tickets with `/ticket-delete`

### For Regular Users

1. **Get Help**
   - Use `/help` to see available commands
   - Use `/ping` to check bot status

2. **Create Support Tickets**
   - Click "Create Ticket" on the ticket panel
   - Select appropriate category and provide details
   - Wait for staff response in your private ticket channel

## 🔧 **Configuration**

### Bot Settings
Edit `config/config.js` to customize:
- Ticket categories and descriptions
- Timeout duration limits
- Embed colors and emojis
- Maximum tickets per user

### Permission Setup
The bot requires these permissions:
- **Manage Channels** - Create/delete ticket channels
- **Manage Messages** - Clean up and manage content
- **Kick Members** - Use kick command
- **Ban Members** - Use ban/unban commands
- **Moderate Members** - Use timeout commands
- **Send Messages** - Basic functionality
- **Use Slash Commands** - Command system

## 📝 **Command Reference**

### Moderation Commands (Admin Only)
| Command | Description | Usage |
|---------|-------------|-------|
| `/kick` | Kick a member | `/kick user:@user reason:optional` |
| `/timeout` | Timeout a member | `/timeout user:@user duration:10m reason:optional` |
| `/remove-timeout` | Remove timeout | `/remove-timeout user:@user reason:optional` |
| `/ban` | Ban a member | `/ban user:@user reason:optional delete_days:0-7` |
| `/unban` | Unban a user | `/unban user_id:123456789 reason:optional` |

### Ticket Commands (Admin Only)
| Command | Description | Usage |
|---------|-------------|-------|
| `/ticket-panel` | Create ticket panel | `/ticket-panel channel:optional` |
| `/ticket-close` | Close current ticket | `/ticket-close reason:optional` |
| `/ticket-delete` | Delete ticket channel | `/ticket-delete reason:optional` |
| `/ticket-list` | List tickets | `/ticket-list status:optional user:optional` |

### General Commands (Everyone)
| Command | Description | Usage |
|---------|-------------|-------|
| `/help` | Show help information | `/help category:optional` |
| `/ping` | Check bot status | `/ping` |

## 🔐 **Security Features**

- **Multi-layer Permission Validation**: Commands check permissions at multiple levels
- **Admin-Only Visibility**: Slash commands only appear for administrators
- **Safe Default Settings**: Conservative timeout limits and validation
- **Audit Logging**: All moderation actions are logged with reasons
- **Error Handling**: Comprehensive error handling prevents crashes
- **Input Validation**: All user inputs are validated and sanitized

## 🚀 **Development**

### Adding New Commands
1. Create command file in appropriate `/commands/` subdirectory
2. Follow the existing command structure with `data` and `execute` properties
3. Set `adminOnly: true` for admin-restricted commands
4. Commands are automatically loaded on bot restart

### Database Models
- Extend existing models or create new ones in `/models/`
- Use Mongoose schemas for data validation
- Include proper indexing for performance

### Error Handling
- All errors are logged with timestamps
- User-friendly error messages are sent as ephemeral replies
- Bot continues running even after command failures

## 📊 **Monitoring**

- Console logging with timestamps and levels
- Database connection monitoring
- Memory usage tracking
- Automatic reconnection handling

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Follow existing code style and structure
4. Test thoroughly with admin and non-admin accounts
5. Submit a pull request

## 📄 **License**

This project is licensed under the CC0-1.0 License - see the LICENSE file for details.

## 🆘 **Support**

For support or questions:
1. Use the `/help` command in Discord
2. Check the console logs for error messages
3. Verify your environment variables and permissions
4. Ensure MongoDB connection is working

---

**DisTrack Bot** - Professional Discord server management made simple and secure.
