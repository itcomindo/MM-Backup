"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const BackupManager_1 = require("./BackupManager");
function activate(context) {
    const manager = new BackupManager_1.BackupManager();
    // Command 1: Backup
    let backupCmd = vscode.commands.registerCommand('mm-backup.makeBackup', async () => {
        await manager.performBackup();
    });
    // Command 2: Restore
    let restoreCmd = vscode.commands.registerCommand('mm-backup.restoreBackup', async () => {
        await manager.restoreBackup();
    });
    context.subscriptions.push(backupCmd, restoreCmd);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map