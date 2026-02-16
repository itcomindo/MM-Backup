# MM Backup 🛡️

**Versi:** 1.0.1  
**Author:** Budi Haryono (CodeF)  
**License:** MIT

**MM Backup** adalah ekstensi VS Code "Life Saver" yang dirancang khusus untuk developer yang sering melakukan refactoring kode, eksperimen fitur, atau sekadar ingin rasa aman ekstra sebelum mengubah kode yang kompleks.

Lupakan rasa takut kode menjadi _error_ atau berantakan saat diedit. Dengan satu perintah, MM Backup membuat _snapshot_ file Anda secara lokal dan instan.

---

## 🚀 Mengapa Anda Membutuhkan Ini?

Sebagai developer, kita sering menghadapi situasi ini:

> _"Saya ingin merombak fungsi ini, tapi takut kalau gagal saya lupa kode aslinya seperti apa. Kalau pakai Git commit rasanya terlalu ribet untuk perubahan kecil/sementara, dan Ctrl+Z ada batasnya (hilang jika file ditutup)."_

**MM Backup adalah solusinya.**

### ✨ Keuntungan Utama:

1.  **Safety Net Instan:** Backup file dalam hitungan milidetik sebelum Anda mengacak-acak kode.
2.  **Tanpa Ribet Git:** Tidak perlu `git add`, `git commit` hanya untuk simpanan sementara. Backup disimpan lokal di folder terpisah.
3.  **Refactor dengan Percaya Diri:** Bebas eksperimen! Jika gagal, tinggal **Restore** ke versi sebelumnya dalam detik.
4.  **Aman untuk Repo:** Ekstensi ini cerdas! Folder backup otomatis ditambahkan ke `.gitignore` agar repository Git Anda tidak kotor dengan file sampah.

---

## 🔥 Fitur Unggulan

### 1. Dynamic Incremental Backup

Ekstensi ini tidak menimpa backup lama. Ia membuat versi baru setiap kali Anda mem-backup.

- Backup ke-1: `style-mbu-1.css`
- Backup ke-2: `style-mbu-2.css`
- Backup ke-3: `style-mbu-3.css`
- _(Angka terbesar adalah versi terbaru)_

### 2. Smart Restore (Undo-able) 🆕

Fitur restore kami **sangat aman**. Saat Anda me-restore file:

- Ekstensi **tidak menimpa** file fisik di hard disk secara kasar.
- Ekstensi mengganti teks di editor VS Code Anda.
- **Artinya:** Jika Anda salah restore, Anda cukup tekan `Ctrl+Z` (Undo) di editor untuk kembali.

### 3. Context Aware

Saat melakukan restore, ekstensi hanya menampilkan daftar backup yang relevan dengan file yang sedang Anda buka. Anda tidak perlu pusing mencari di antara ratusan file backup lain.

### 4. Auto Gitignore Injection

Ekstensi otomatis mendeteksi jika ada file `.gitignore` di project Anda dan menambahkan folder `MM-Backup/` ke dalamnya. Privasi kode aman.

---

## 📖 Cara Penggunaan

### Melakukan Backup (Save Snapshot)

1.  Buka file yang ingin Anda amankan (contoh: `functions.php`).
2.  Tekan `F1` atau `Ctrl+Shift+P` untuk membuka Command Palette.
3.  Ketik dan pilih: **MM Backup: Backup Current File**.
4.  Selesai! File cadangan tersimpan di folder `MM-Backup` di root project Anda.

### Melakukan Restore (Mengembalikan File)

1.  Buka file asli yang ingin dikembalikan (contoh: `functions.php`).
2.  Tekan `F1` atau `Ctrl+Shift+P`.
3.  Ketik dan pilih: **MM Backup: Restore File**.
4.  Akan muncul daftar versi backup beserta jam pembuatannya.
5.  Pilih versi yang diinginkan. Kode Anda akan kembali seperti semula.

---

## 📂 Struktur Folder

Semua file backup disimpan dalam satu folder terpusat di root workspace Anda agar rapi:

```text
Project-Folder/
├── .gitignore          <-- MM-Backup otomatis didaftarkan di sini
├── functions.php       <-- File Asli
├── style.css           <-- File Asli
└── MM-Backup/          <-- Folder Penyimpanan
    ├── functions-mbu-1.php
    ├── functions-mbu-2.php
    ├── style-mbu-1.css
    └── ...
```

## ⚙️ Persyaratan

VS Code versi 1.75.0 atau lebih baru.
Membuka folder/workspace (Backup tidak berjalan pada file tunggal tanpa workspace).

## 👨‍💻 Kontribusi & Masalah

Temukan bug atau punya ide fitur baru? Silakan kunjungi repository kami:
GitHub Repository - MM Backup

Enjoy Coding with Peace of Mind! 🛡️
