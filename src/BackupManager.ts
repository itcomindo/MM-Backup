import * as vscode from 'vscode';
import * as path from 'path';

interface BackupFile {
    label: string;      // Nama file backup (misal: style-mbu-5.css)
    description: string; // Info waktu (misal: 12:30 PM - 2 minutes ago)
    uri: vscode.Uri;    // Lokasi file backup
    version: number;    // Angka urutan backup
}

export class BackupManager {
    private readonly backupFolderName = 'MM-Backup';

    // --- FITUR 1: BACKUP ---
    public async performBackup() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('MM Backup: Tidak ada file yang terbuka.');
            return;
        }

        const document = editor.document;
        if (document.isUntitled || document.uri.scheme !== 'file') {
            vscode.window.showWarningMessage('MM Backup: File harus disimpan di disk terlebih dahulu.');
            return;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('MM Backup: File harus berada dalam Workspace.');
            return;
        }

        const rootUri = workspaceFolder.uri;
        const backupFolderUri = vscode.Uri.joinPath(rootUri, this.backupFolderName);

        try {
            // Cek folder backup
            try { await vscode.workspace.fs.stat(backupFolderUri); }
            catch {
                await vscode.workspace.fs.createDirectory(backupFolderUri);
                await this.addToGitignore(rootUri);
            }

            const parsedPath = path.parse(document.uri.fsPath);
            const fileName = parsedPath.name;
            const fileExt = parsedPath.ext;

            const nextIndex = await this.getNextIndex(backupFolderUri, fileName, fileExt);
            const newFileName = `${fileName}-mbu-${nextIndex}${fileExt}`;
            const targetUri = vscode.Uri.joinPath(backupFolderUri, newFileName);

            // Copy File
            await vscode.workspace.fs.copy(document.uri, targetUri, { overwrite: false });

            vscode.window.setStatusBarMessage(`MM Backup: Saved ${newFileName}`, 3000);

        } catch (error: any) {
            vscode.window.showErrorMessage(`Backup Gagal: ${error.message}`);
        }
    }

    // --- FITUR 2: RESTORE (NEW) ---
    public async restoreBackup() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('MM Backup: Buka file asli yang ingin di-restore terlebih dahulu.');
            return;
        }

        const document = editor.document;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) return;

        const rootUri = workspaceFolder.uri;
        const backupFolderUri = vscode.Uri.joinPath(rootUri, this.backupFolderName);

        try {
            // 1. Cek folder backup ada atau tidak
            try { await vscode.workspace.fs.stat(backupFolderUri); }
            catch {
                vscode.window.showInformationMessage('MM Backup: Belum ada folder backup ditemukan.');
                return;
            }

            // 2. Parse nama file aktif
            const parsedPath = path.parse(document.uri.fsPath);
            const baseName = parsedPath.name; // style
            const ext = parsedPath.ext;       // .css

            // 3. Cari file backup yang relevan
            const relevantBackups = await this.findBackupsForFile(backupFolderUri, baseName, ext);

            if (relevantBackups.length === 0) {
                vscode.window.showInformationMessage(`MM Backup: Tidak ditemukan backup untuk file "${baseName}${ext}".`);
                return;
            }

            // 4. Tampilkan Pilihan (QuickPick)
            const selected = await vscode.window.showQuickPick(relevantBackups, {
                placeHolder: 'Pilih versi backup yang ingin dikembalikan (Restore)',
                title: `Restore: ${baseName}${ext}`
            });

            if (selected) {
                // 5. Lakukan Restore (Replace content editor)
                // Kita baca isi file backup
                const backupData = await vscode.workspace.fs.readFile(selected.uri);
                const backupContent = new TextDecoder().decode(backupData);

                // Kita ganti isi editor (Undo-able)
                editor.edit(editBuilder => {
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document.getText().length)
                    );
                    editBuilder.replace(fullRange, backupContent);
                }).then(success => {
                    if (success) {
                        vscode.window.showInformationMessage(`Berhasil restore versi ${selected.version}. Tekan Ctrl+Z jika ingin undo.`);
                    }
                });
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`Restore Gagal: ${error.message}`);
        }
    }

    // --- HELPER FUNCTIONS ---

    private async findBackupsForFile(folderUri: vscode.Uri, fileName: string, fileExt: string): Promise<BackupFile[]> {
        const files = await vscode.workspace.fs.readDirectory(folderUri);
        const escapedName = this.escapeRegExp(fileName);
        const escapedExt = this.escapeRegExp(fileExt);

        // Regex: style-mbu-(\d+).css
        const pattern = new RegExp(`^${escapedName}-mbu-(\\d+)${escapedExt}$`, 'i');

        const backupList: BackupFile[] = [];

        for (const [name, type] of files) {
            if (type === vscode.FileType.File) {
                const match = name.match(pattern);
                if (match) {
                    const version = parseInt(match[1], 10);
                    const fileUri = vscode.Uri.joinPath(folderUri, name);

                    // Ambil info tanggal modifikasi
                    const stat = await vscode.workspace.fs.stat(fileUri);
                    const date = new Date(stat.mtime);
                    const dateStr = date.toLocaleString(); // Format waktu lokal

                    backupList.push({
                        label: `Versi ${version}`, // Text utama di dropdown
                        description: `(${dateStr}) - ${name}`, // Text kecil di kanan
                        uri: fileUri,
                        version: version
                    });
                }
            }
        }

        // Sort descending (Versi terbesar/terbaru di atas)
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
