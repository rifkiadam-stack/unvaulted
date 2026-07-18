---
type: panduan
title: Panduan Penggunaan Unvaulted
created: 2026-07-18
tags:
  - unvaulted
  - panduan
---

Selamat datang di **Unvaulted** — buka file ini *di Unvaulted* dan semua contoh di bawah akan tampil hidup, persis seperti hasilnya.

> [!tip] Cara pakai panduan ini
> Sintaks mentah ditulis di dalam `kode seperti ini` supaya tidak ikut dirender. Baris di sekitarnya adalah hasil jadinya. Taruh kursor di baris mana pun untuk mengintip sintaks aslinya — menjauh, dan tampilannya kembali rapi.

## Apa itu Unvaulted?

Secara konsep Unvaulted itu **Notepad**: satu file, satu jendela, buka-tulis-simpan, tanpa vault, tanpa sidebar, tanpa ribet. Tapi *rasa menulisnya* **Obsidian**: apa yang kamu ketik langsung dirender cantik di tempat (live preview).

## Dasar-dasar

| Aksi | Cara |
|------|------|
| Buka file | Double-click file `.md`/`.txt` (pilih Unvaulted di *Open with*), atau `Ctrl+O`, atau seret file ke jendela |
| Simpan | `Ctrl+S` — perubahan belum tersimpan ditandai `*` di title bar |
| Simpan sebagai | `Ctrl+Shift+S` (bisa `.md`, `.txt`, atau bebas) |
| Cari dalam file | `Ctrl+F` |
| Tutup jendela | `Ctrl+W` — kalau ada perubahan belum disimpan, akan dikonfirmasi dulu |
| Ganti tema | Klik ikon ☀ / 🌙 di pojok kanan atas (gelap = bawaan) |

Judul besar di baris paling atas adalah **nama file** — dia tidak bisa diedit dari dalam; ganti nama filenya (F2 di Explorer) untuk mengubahnya.

## Sintaks penulisan

### Heading

Ketik `#` sampai `######` diikuti spasi di awal baris:

# Heading 1
## Heading 2
### Heading 3

### Gaya teks

- `**tebal**` → **tebal**
- `*miring*` → *miring*
- `~~coret~~` → ~~coret~~
- `==stabilo==` → ==stabilo==
- `` `kode sebaris` `` → `kode sebaris`

### Garis pemisah

Ketik `---` di baris kosong (bukan baris pertama file!) → jadi garis horizontal:

---

### Daftar

Ketik `- ` untuk butir, `1. ` untuk bernomor, `- [ ] ` untuk checklist:

- butir biasa
- butir lagi

1. langkah pertama
2. langkah kedua

- [ ] tugas belum selesai — **klik kotaknya** untuk mencentang!
- [x] tugas selesai

### Kutipan & Callout

Ketik `> ` di awal baris untuk kutipan:

> Ini kutipan biasa.

Ketik `> [!note]` (atau `tip`, `info`, `warning`, `danger`, `question`, `success`, `quote`) untuk callout gaya Obsidian:

> [!note] Judul catatan
> Isi callout di baris berikutnya, tetap diawali `> `.

> [!warning] Hati-hati
> Callout warna oranye untuk peringatan.

### Tabel

Ketik baris sel dipisah `|`, lalu baris `|---|---|` di bawah header:

| Kolom A | Kolom B |
|---------|---------|
| isi     | isi     |

### Blok kode

Apit dengan tiga backtick (```` ``` ````), boleh sebut bahasanya untuk pewarnaan:

```js
function halo() {
  console.log("Unvaulted!");
}
```

### Tautan

`[teks](https://alamat.com)` → [contoh tautan](https://example.com) — bisa diklik, terbuka di browser.

## Properties (metadata file)

Ketik `---` di **baris pertama** file → blok Properties otomatis terbentuk dan tampil sebagai kartu (lihat kartu di paling atas file ini!).

- **+ Add property** → pilih dari saran (`trigger`, `tags`, `created`, `updated`, `type`, `title`, `sources`) **atau ketik nama apa pun** lalu Enter.
- **Klik sebuah nilai** untuk mengedit → `Enter` simpan, `Esc` batal.
- `tags` dan `sources` adalah **daftar**: isi dipisah koma (`belajar, git, penting`) → tersimpan sebagai list YAML dan tampil sebagai chip.
- `created` / `updated` otomatis terisi tanggal hari ini (`YYYY-MM-DD`) saat ditambahkan.
- Tombol `×` di kanan baris (muncul saat hover) menghapus property itu.
- Nilai kompleks/bertingkat tampil apa adanya (read-only) dan **tidak akan pernah dirusak**.
- Mau lihat/edit YAML mentahnya? Taruh kursor di dalam blok — kartu berubah jadi teks mentah.

## Gambar

- **Paste dari clipboard** (`Ctrl+V` pada gambar) → gambar tersimpan otomatis ke folder terpusat `Pictures\Unvaulted`, dan `![[Pasted image ...]]` tertulis di catatanmu.
- **Embed gaya Obsidian** `![[nama-gambar.png]]` → dirender langsung. Unvaulted mencari filenya di: folder catatan → subfolder `attachments` → folder induk (hingga 5 tingkat) → folder lampiran sesuai config Obsidian (kalau catatannya bagian dari vault) → folder terpusat Unvaulted.
- Kalau kamu **menghapus** referensi `![[Pasted image ...]]` lalu menyimpan, Unvaulted menawarkan ikut menghapus file gambarnya — biar tidak ada file yatim menumpuk. Pilih *No* kalau masih dipakai file lain.
- Gambar `![alt](path-atau-url)` standar juga didukung.

## File `.txt` dan format teks lain

Unvaulted membedakan dua mode secara otomatis dari ekstensi file:

- **`.md` / `.markdown`** → mode markdown penuh: semua gaya di panduan ini aktif.
- **Ekstensi lain** (`.txt`, `.json`, `.csv`, `.log`, dll) → **mode polos ala Notepad**: teks tampil persis apa adanya — `---` tetap tiga strip, `**` tetap dua bintang, dan tidak ada kartu Properties. Isi file tidak pernah diubah bentuknya.

Dialog Open (`Ctrl+O`) langsung menampilkan semua file yang didukung (`.md`, `.markdown`, `.txt`); pilih "All Files" untuk membuka format teks lain — atau cukup seret filenya ke jendela. Unvaulted juga muncul di klik-kanan → *Open with* untuk format teks umum, tanpa pernah mengambil alih aplikasi default-mu.

## Yang sengaja "mati"

Unvaulted untuk file **berdiri sendiri** — tanpa vault. Maka sintaks yang butuh vault tetap dirender *cantik*, tapi tidak berbuat apa-apa:

- `[[wikilink]]` → tampil sebagai [[contoh wikilink]] bergaya tautan, tapi tidak bisa diklik.
- `#tag` → tampil sebagai pill #contoh-tag, tidak bisa diklik.
- `![[embed-non-gambar]]` (mis. embed catatan lain) → tampil sebagai pill, tidak di-load.

Ini disengaja: catatanmu dari Obsidian tetap *terlihat* benar, tanpa pura-pura punya fitur vault.

> [!success] Selesai!
> Itu saja — sisanya tinggal menulis. Simpan file ini dan buka lagi kapan pun butuh contekan.
