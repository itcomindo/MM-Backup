import * as vscode from 'vscode';
import { BackupManager } from './BackupManager';

export function activate(context: vscode.ExtensionContext) {
    const manager = new BackupManager();

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

export function deactivate() { }
