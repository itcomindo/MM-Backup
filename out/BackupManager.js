"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupManager = void 0;
const vscode = require("vscode");
const path = require("path");
class BackupManager {
    constructor() {
        this.backupFolderName = 'MM-Backup';
    }
    async performBackup() {
        // 1. Cek ada editor aktif atau tidak
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('MM Backup: Tidak ada file yang terbuka untuk di-backup.');
            return;
        }
        const document = editor.document;
        // Hanya backup file yang tersimpan di disk (bukan untitled atau virtual)
        if (document.isUntitled || document.uri.scheme !== 'file') {
            vscode.window.showWarningMessage('MM Backup: Silakan simpan file terlebih dahulu sebelum backup.');
            return;
        }
        // 2. Tentukan Root Workspace
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('MM Backup: File harus berada dalam Workspace/Project.');
            return;
        }
        const rootUri = workspaceFolder.uri;
        const backupFolderUri = vscode.Uri.joinPath(rootUri, this.backupFolderName);
        try {
            // 3. Cek/Buat Folder MM-Backup
            try {
                await vscode.workspace.fs.stat(backupFolderUri);
            }
            catch (error) {
                // Folder belum ada, buat baru
                await vscode.workspace.fs.createDirectory(backupFolderUri);
                // Senior Feature: Tambahkan ke .gitignore
                await this.addToGitignore(rootUri);
            }
            // 4. Generate Nama File Backup
            const originalPath = document.uri.fsPath;
            const parsedPath = path.parse(originalPath);
            const fileName = parsedPath.name; // misal: front-page
            const fileExt = parsedPath.ext; // misal: .php
            // Logic: Cari index tertinggi
            const nextIndex = await this.getNextIndex(backupFolderUri, fileName, fileExt);
            // Nama baru: front-page-mbu-1.php
            const newFileName = `${fileName}-mbu-${nextIndex}${fileExt}`;
            const targetUri = vscode.Uri.joinPath(backupFolderUri, newFileName);
            // 5. Lakukan Copy
            await vscode.workspace.fs.copy(document.uri, targetUri, { overwrite: false });
            // 6. Notifikasi Sukses
            const openBtn = 'Buka Backup';
            vscode.window.showInformationMessage(`MM Backup: Sukses! File tersimpan sebagai ${newFileName}`, openBtn).then(selection => {
                if (selection === openBtn) {
                    vscode.commands.executeCommand('vscode.open', targetUri);
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`MM Backup Gagal: ${error.message}`);
        }
    }
    /**
     * Mencari angka urutan berikutnya.
     * Contoh: jika ada file-mbu-1.php dan file-mbu-2.php, maka return 3.
     */
    async getNextIndex(backupFolderUri, fileName, fileExt) {
        try {
            // Baca semua file di folder backup
            const files = await vscode.workspace.fs.readDirectory(backupFolderUri);
            // Filter file yang namanya mirip
            // Pola regex: ^namafile-mbu-(\d+)\.ext$
            // Kita escape fileName agar aman jika ada karakter spesial
            const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`^${escapedName}-mbu-(\\d+)${this.escapeRegExp(fileExt)}$`, 'i');
            let maxIndex = 0;
            for (const [name, type] of files) {
                if (type === vscode.FileType.File) {
                    const match = name.match(pattern);
                    if (match) {
                        const index = parseInt(match[1], 10);
                        if (index > maxIndex) {
                            maxIndex = index;
                        }
                    }
                }
            }
            return maxIndex + 1;
        }
        catch (error) {
            // Jika gagal baca folder (sangat jarang terjadi jika folder baru dibuat), return 1
            return 1;
        }
    }
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Senior Feature: Otomatis tambah MM-Backup/ ke .gitignore jika file tersebut ada
     */
    async addToGitignore(rootUri) {
        const gitignoreUri = vscode.Uri.joinPath(rootUri, '.gitignore');
        try {
            // Cek apakah .gitignore ada
            const stat = await vscode.workspace.fs.stat(gitignoreUri);
            if (stat.type === vscode.FileType.File) {
                // Baca isinya
                const data = await vscode.workspace.fs.readFile(gitignoreUri);
                const content = new TextDecoder().decode(data);
                // Cek apakah MM-Backup sudah terdaftar
                if (!content.includes(this.backupFolderName)) {
                    const newContent = content + `\n\n# MM Backup Extension\n${this.backupFolderName}/\n`;
                    await vscode.workspace.fs.writeFile(gitignoreUri, new TextEncoder().encode(newContent));
                    vscode.window.showInformationMessage('MM Backup: Folder backup otomatis ditambahkan ke .gitignore');
                }
            }
        }
        catch (error) {
            // .gitignore tidak ada, abaikan saja (tidak perlu buat .gitignore baru jika user tidak pakai git)
        }
    }
}
exports.BackupManager = BackupManager;
//# sourceMappingURL=BackupManager.js.map