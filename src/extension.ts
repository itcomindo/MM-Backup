import * as vscode from 'vscode';
import { BackupManager } from './BackupManager';

export function activate(context: vscode.ExtensionContext) {
    // Register Command
    let disposable = vscode.commands.registerCommand('mm-backup.makeBackup', async () => {
        const manager = new BackupManager();
        await manager.performBackup();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
