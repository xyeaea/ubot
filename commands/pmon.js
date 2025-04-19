module.exports = {
  command: ".pmon",
  run: async ({ client, message, args, statusCollection, pmCollection }) => {
    try {
      const text = args.join(" ").trim();

      if (!text) {
        return await client.sendMessage(message.chatId, {
          message: "Silakan masukkan pesan untuk auto-reply, contoh:\n.pmon Halo! Ada yang bisa dibantu?",
        });
      }

      // Simpan atau update status aktif
      await statusCollection.updateOne(
        { _id: "pm_status" },
        { $set: { status: "on" } },
        { upsert: true }
      );

      // Simpan pesan auto-reply terbaru
      const result = await pmCollection.insertOne({
        text: text,
        createdAt: new Date(),
      });

      await client.sendMessage(message.chatId, {
        message: `Auto-reply PM diaktifkan.\nPesan disimpan dengan ID: ${result.insertedId}`,
      });
    } catch (err) {
      console.error("Gagal mengaktifkan PM:", err.message);
      await client.sendMessage(message.chatId, {
        message: "Terjadi kesalahan saat mengaktifkan auto-reply PM.",
      });
    }
  },
};
