module.exports = {
  command: ".gcast",
  run: async ({ client, message, args }) => {
    const senderId = String(message.senderId).trim();
    const meId = String((await client.getMe()).id).trim();

    if (senderId !== meId) {
      return client.sendMessage(message.chatId, {
        message: "Kamu tidak diizinkan menggunakan command ini.",
      });
    }

    if (args.length < 3) {
      return client.sendMessage(message.chatId, {
        message: "Format salah!\nContoh: `.gcast Halo semua! 50 180`\n(teks jumlah pengulangan jeda_detik)",
      });
    }

    const jeda = parseInt(args.pop()) * 1000;
    const jumlah = parseInt(args.pop());
    const teks = args.join(' ').trim();

    if (!teks) {
      return client.sendMessage(message.chatId, {
        message: "Pesan tidak boleh kosong.",
      });
    }

    if (isGcastRunning) {
      return client.sendMessage(message.chatId, {
        message: "Gcast sedang berjalan. Gunakan `.stopgcast` untuk menghentikan.",
      });
    }

    isGcastRunning = true;

    const dialogs = await client.getDialogs();
    const grups = dialogs.filter(d => d.isGroup);

    if (grups.length === 0) {
      isGcastRunning = false;
      return client.sendMessage(message.chatId, {
        message: "Tidak ada grup ditemukan.",
      });
    }

    for (let i = 1; i <= jumlah && isGcastRunning; i++) {
      let terkirim = 0;

      for (const grup of grups) {
        if (!isGcastRunning) break;

        try {
          await client.sendMessage(grup.id, { message: teks });
          console.log(`[${i}/${jumlah}] Terkirim ke: ${grup.title}`);
          terkirim++;
        } catch (err) {
          console.log(`[GAGAL] ${grup.title}: ${err.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      await client.sendMessage(message.chatId, {
        message: `Gcast ke-${i} selesai. Terkirim ke ${terkirim} grup.`,
      });

      if (i < jumlah && isGcastRunning) {
        console.log(`Menunggu ${jeda / 1000} detik sebelum pengulangan berikutnya...`);
        await new Promise(resolve => setTimeout(resolve, jeda));
      }
    }

    isGcastRunning = false;
    if (!isGcastRunning) {
      await client.sendMessage(message.chatId, {
        message: "Gcast dihentikan.",
      });
    }
  }
};
