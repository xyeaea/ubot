module.exports = {
  command: ".pmon",
  run: async ({ client, message, args, statusCollection, pmCollection }) => {
    try {
      // Gabungkan args menjadi satu string dan hapus spasi ekstra
      const text = args.join(" ").trim();

      // Validasi apakah ada link dalam pesan (termasuk t.me)
      const urlPattern = /(https?:\/\/[^\s]+|t\.me\/[^\s]+)/;
      if (!urlPattern.test(text)) {
        return await client.sendMessage(message.chatId, {
          message: "Silakan masukkan pesan yang berisi link yang valid, contoh:\n.pmon https://example.com atau t.me/username",
        });
      }

      // Ubah link menjadi tag HTML <a> agar bisa diklik
      const formattedText = text.replace(urlPattern, (url) => {
        // Cek jika URL adalah t.me
        if (url.startsWith("t.me")) {
          return `<a href="https://${url}">${url}</a>`; // Ubah menjadi full link t.me
        }
        return `<a href="${url}">${url}</a>`; // Ubah link lainnya menjadi tag <a>
      });

      // Simpan atau update status aktif
      await statusCollection.updateOne(
        { _id: "pm_status" },
        { $set: { status: "on" } },
        { upsert: true }
      );

      // Simpan pesan auto-reply terbaru dengan link yang terformat
      const result = await pmCollection.insertOne({
        text: formattedText,
        createdAt: new Date(),
      });

      // Kirim balasan ke user dengan format HTML
      await client.sendMessage(message.chatId, {
        message: `Auto-reply PM diaktifkan dengan pesan:\n${formattedText}\nPesan disimpan dengan ID: ${result.insertedId}`,
        parseMode: 'html', // Pastikan format HTML diterapkan
      });
    } catch (err) {
      console.error("Gagal mengaktifkan PM:", err.message);
      await client.sendMessage(message.chatId, {
        message: "Terjadi kesalahan saat mengaktifkan auto-reply PM.",
      });
    }
  },
};
