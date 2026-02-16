"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const BackupManager_1 = require("./BackupManager");
function activate(context) {
    // Register Command
    let disposable = vscode.commands.registerCommand('mm-backup.makeBackup', async () => {
        const manager = new BackupManager_1.BackupManager();
        await manager.performBackup();
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map