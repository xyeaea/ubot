module.exports = {
  command: ".pmof",
  run: async ({ client, message, statusCollection }) => {
    try {
      // Menonaktifkan auto-reply PM dengan status "off"
      await statusCollection.updateOne(
        { _id: "pm_status" },
        { $set: { status: "off" } },
        { upsert: true }
      );

      // Memberitahukan pengguna bahwa auto-reply telah dimatikan
      await client.sendMessage(message.chatId, {
        message: "Auto-reply PM telah dimatikan.",
      });
    } catch (err) {
      console.error("Gagal menonaktifkan PM:", err.message);
      await client.sendMessage(message.chatId, {
        message: "Terjadi kesalahan saat menonaktifkan auto-reply PM.",
      });
    }
  },
};
