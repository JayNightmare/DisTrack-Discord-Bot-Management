/**
 * Command deployment script
 * Use this script to manually deploy commands to Discord
 */

const CommandDeployer = require("./utils/CommandDeployer");
const Utils = require("./utils/Utils");

async function main() {
    const deployer = new CommandDeployer();
    const args = process.argv.slice(2);

    try {
        if (args.includes("--help") || args.includes("-h")) {
            console.log(`
Command Deployment Script

Usage:
  node deploy-commands.js [options]

Options:
  --guild <id>     Deploy to specific guild (faster for testing)
  --global         Deploy globally (default, slower but reaches all servers)
  --delete         Delete all commands
  --check          Check if commands need updating
  --help, -h       Show this help message

Examples:
  node deploy-commands.js --global
  node deploy-commands.js --guild 123456789012345678
  node deploy-commands.js --delete --guild 123456789012345678
  node deploy-commands.js --check
            `);
            return;
        }

        const guildIndex = args.indexOf("--guild");
        const guildId = guildIndex !== -1 ? args[guildIndex + 1] : null;
        const isGlobal = args.includes("--global");
        const shouldDelete = args.includes("--delete");
        const checkOnly = args.includes("--check");

        if (checkOnly) {
            Utils.log("Checking if commands need updating...", "INFO");
            const needsUpdate = await deployer.needsUpdate(guildId);
            Utils.log(
                `Commands ${needsUpdate ? "NEED" : "DO NOT NEED"} updating`,
                needsUpdate ? "WARN" : "INFO"
            );
            return;
        }

        if (shouldDelete) {
            if (guildId) {
                await deployer.deleteGuildCommands(guildId);
            } else {
                await deployer.deleteGlobalCommands();
            }
            return;
        }

        if (guildId) {
            await deployer.deployGuild(guildId);
        } else {
            await deployer.deployGlobal();
        }

        Utils.log("Command deployment completed successfully!", "INFO");
    } catch (error) {
        Utils.log(`Deployment failed: ${error.message}`, "ERROR");
        console.error(error);
        process.exit(1);
    }
}

main();
