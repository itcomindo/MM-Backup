import * as vscode from 'vscode';
import * as path from 'path';

// Interface untuk QuickPick Item saat Restore
interface BackupFileItem extends vscode.QuickPickItem {
    uri: vscode.Uri;
    version: number;
}

// Interface untuk struktur JSON Log
interface BackupLog {
    [filename: string]: {
        originalFile: string;
        description: string;
        timestamp: string;
    }
}

export class BackupManager {
    private readonly backupFolderName = 'MM-Backup';
    private readonly logFileName = 'backup-log.json';

    // --- FITUR 1: BACKUP DENGAN DESKRIPSI ---
    public async performBackup() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('MM Backup: Tidak ada file yang terbuka.');
            return;
        }

        const document = editor.document;
        if (document.isUntitled || document.uri.scheme !== 'file') {
            vscode.window.showWarningMessage('MM Backup: Simpan file ke disk terlebih dahulu.');
            return;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('MM Backup: File harus berada dalam Workspace.');
            return;
        }

        // UX: Minta Deskripsi (Keyboard First)
        // User mengetik alasan, Enter untuk lanjut. Escape untuk skip (kosong).
        const description = await vscode.window.showInputBox({
            placeHolder: 'Masukkan deskripsi/alasan backup (Opsional)',
            title: 'MM Backup Description',
            prompt: 'Contoh: Refactor header, Fix bug login, Experimental change'
        });

        // Jika user menekan Escape (undefined), kita anggap string kosong
        const finalDesc = description || 'No description provided';

        const rootUri = workspaceFolder.uri;
        const backupFolderUri = vscode.Uri.joinPath(rootUri, this.backupFolderName);

        try {
            // Cek/Buat Folder Backup & Gitignore
            try { await vscode.workspace.fs.stat(backupFolderUri); }
            catch {
                await vscode.workspace.fs.createDirectory(backupFolderUri);
                await this.addToGitignore(rootUri);
            }

            const parsedPath = path.parse(document.uri.fsPath);
            const fileName = parsedPath.name;
            const fileExt = parsedPath.ext;

            const nextIndex = await this.getNextIndex(backupFolderUri, fileName, fileExt);

            // Nama File: style-mbu-1.css
            const newFileName = `${fileName}-mbu-${nextIndex}${fileExt}`;
            const targetUri = vscode.Uri.joinPath(backupFolderUri, newFileName);

            // Copy File
            await vscode.workspace.fs.copy(document.uri, targetUri, { overwrite: false });

            // SIMPAN LOG DESKRIPSI KE JSON
            await this.saveToLog(backupFolderUri, newFileName, parsedPath.base, finalDesc);

            vscode.window.setStatusBarMessage(`MM Backup: Saved ${newFileName} ("${finalDesc}")`, 4000);

        } catch (error: any) {
            vscode.window.showErrorMessage(`Backup Gagal: ${error.message}`);
        }
    }

    // --- FITUR 2: RESTORE DENGAN PREVIEW DESKRIPSI ---
    public async restoreBackup() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('MM Backup: Buka file asli yang ingin di-restore.');
            return;
        }

        const document = editor.document;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) return;

        const rootUri = workspaceFolder.uri;
        const backupFolderUri = vscode.Uri.joinPath(rootUri, this.backupFolderName);

        try {
            // Cek folder
            try { await vscode.workspace.fs.stat(backupFolderUri); }
            catch {
                vscode.window.showInformationMessage('MM Backup: Folder backup belum ada.');
                return;
            }

            const parsedPath = path.parse(document.uri.fsPath);
            const baseName = parsedPath.name;
            const ext = parsedPath.ext;

            // Cari Backup + Deskripsinya
            const relevantBackups = await this.findBackupsForFile(backupFolderUri, baseName, ext);

            if (relevantBackups.length === 0) {
                vscode.window.showInformationMessage(`Tidak ada backup untuk file "${baseName}${ext}".`);
                return;
            }

            // Tampilkan Pilihan
            const selected = await vscode.window.showQuickPick(relevantBackups, {
                placeHolder: 'Pilih versi backup untuk di-restore',
                title: `Restore: ${baseName}${ext}`,
                matchOnDetail: true // Agar bisa search berdasarkan deskripsi juga!
            });

            if (selected) {
                // Proses Restore (Undo-able)
                const backupData = await vscode.workspace.fs.readFile(selected.uri);
                const backupContent = new TextDecoder().decode(backupData);

                editor.edit(editBuilder => {
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document.getText().length)
                    );
                    editBuilder.replace(fullRange, backupContent);
                }).then(success => {
                    if (success) {
                        vscode.window.showInformationMessage(`Restore Berhasil: Versi ${selected.version}. (Ctrl+Z untuk Undo)`);
                    }
                });
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`Restore Gagal: ${error.message}`);
        }
    }

    // --- LOGIC JSON LOGGING ---

    /**
     * Menyimpan metadata backup ke file backup-log.json
     */
    private async saveToLog(folderUri: vscode.Uri, backupFilename: string, originalFilename: string, desc: string) {
        const logUri = vscode.Uri.joinPath(folderUri, this.logFileName);
        let logData: BackupLog = {};

        try {
            // Baca log lama jika ada
            const existing = await vscode.workspace.fs.readFile(logUri);
            logData = JSON.parse(new TextDecoder().decode(existing));
        } catch {
            // File belum ada, buat object baru
        }

        // Update Data
        logData[backupFilename] = {
            originalFile: originalFilename,
            description: desc,
            timestamp: new Date().toISOString()
        };

        // Simpan
        await vscode.workspace.fs.writeFile(logUri, new TextEncoder().encode(JSON.stringify(logData, null, 2)));
    }

    /**
     * Membaca log untuk mendapatkan deskripsi
     */
    private async getLogData(folderUri: vscode.Uri): Promise<BackupLog> {
        const logUri = vscode.Uri.joinPath(folderUri, this.logFileName);
        try {
            const data = await vscode.workspace.fs.readFile(logUri);
            return JSON.parse(new TextDecoder().decode(data));
        } catch {
            return {};
        }
    }

    // --- HELPER FUNCTIONS ---

    private async findBackupsForFile(folderUri: vscode.Uri, fileName: string, fileExt: string): Promise<BackupFileItem[]> {
        const files = await vscode.workspace.fs.readDirectory(folderUri);
        const logData = await this.getLogData(folderUri); // Load deskripsi

        const escapedName = this.escapeRegExp(fileName);
        const escapedExt = this.escapeRegExp(fileExt);
        const pattern = new RegExp(`^${escapedName}-mbu-(\\d+)${escapedExt}$`, 'i');

        const backupList: BackupFileItem[] = [];

        for (const [name, type] of files) {
            if (type === vscode.FileType.File && name !== this.logFileName) {
                const match = name.match(pattern);
                if (match) {
                    const version = parseInt(match[1], 10);
                    const fileUri = vscode.Uri.joinPath(folderUri, name);

                    // Ambil Metadata
                    const stat = await vscode.workspace.fs.stat(fileUri);
                    const date = new Date(stat.mtime);
                    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = date.toLocaleDateString();

                    // Ambil Deskripsi dari JSON
                    const meta = logData[name];
                    const descriptionText = meta ? meta.description : 'No description';

                    backupList.push({
                        label: `Versi ${version}`,
                        description: `${timeStr} - ${dateStr}`,
                        detail: `📝 ${descriptionText}`, // Deskripsi muncul disini!
                        uri: fileUri,
                        version: version
                    });
                }
            }
        }

        return backupList.sort((a, b) => b.version - a.version);
    }

    private async getNextIndex(backupFolderUri: vscode.Uri, fileName: string, fileExt: string): Promise<number> {
        try {
            const files = await vscode.workspace.fs.readDirectory(backupFolderUri);
            const escapedName = this.escapeRegExp(fileName);
            const pattern = new RegExp(`^${escapedName}-mbu-(\\d+)${this.escapeRegExp(fileExt)}$`, 'i');
            let maxIndex = 0;

            for (const [name, type] of files) {
                if (type === vscode.FileType.File) {
                    const match = name.match(pattern);
                    if (match) {
                        const index = parseInt(match[1], 10);
                        if (index > maxIndex) maxIndex = index;
                    }
                }
            }
            return maxIndex + 1;
        } catch {
            return 1;
        }
    }

    private escapeRegExp(string: string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private async addToGitignore(rootUri: vscode.Uri) {
        const gitignoreUri = vscode.Uri.joinPath(rootUri, '.gitignore');
        try {
            const stat = await vscode.workspace.fs.stat(gitignoreUri);
            if (stat.type === vscode.FileType.File) {
                const data = await vscode.workspace.fs.readFile(gitignoreUri);
                const content = new TextDecoder().decode(data);
                if (!content.includes(this.backupFolderName)) {
                    const newContent = content + `\n\n# MM Backup Extension\n${this.backupFolderName}/\n`;
                    await vscode.workspace.fs.writeFile(gitignoreUri, new TextEncoder().encode(newContent));
                }
            }
        } catch { }
    }
}
