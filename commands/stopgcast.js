module.exports = {
  command: ".stopgcast",
  run: async ({ client, message }) => {
    const senderId = String(message.senderId).trim();
    const meId = String((await client.getMe()).id).trim();

    if (senderId !== meId) {
      return client.sendMessage(message.chatId, {
        message: "Kamu tidak diizinkan menghentikan gcast.",
      });
    }

    if (!isGcastRunning) {
      return client.sendMessage(message.chatId, {
        message: "Tidak ada proses gcast yang sedang berjalan.",
      });
    }

    isGcastRunning = false;
    await client.sendMessage(message.chatId, {
      message: "Perintah dihentikan. Gcast akan segera berhenti.",
    });
  }
};
