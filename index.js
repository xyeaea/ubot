const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const sessionPath = "session.txt";

let stringSession = fs.existsSync(sessionPath)
  ? new StringSession(fs.readFileSync(sessionPath, "utf8"))
  : new StringSession("");

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// WHITELIST berupa array angka (tanpa newline)
const whitelistIds = process.env.WHITELIST_IDS
  ? process.env.WHITELIST_IDS.split(",").map((id) => parseInt(id.trim()))
  : [];

let dialogsCache = [];

async function loadDialogs() {
  const dialogs = await client.getDialogs();
  dialogsCache = dialogs.filter((d) => d.isGroup);
  console.log(`Group ditemukan: ${dialogsCache.length}`);
}

(async () => {
  await client.start({
    phoneNumber: async () => await input.text("Masukkan nomor HP: "),
    password: async () => await input.text("Masukkan password 2FA (jika ada): "),
    phoneCode: async () => await input.text("Masukkan kode OTP: "),
    onError: (err) => console.log("Login error:", err),
  });

  console.log("Login berhasil!");
  fs.writeFileSync(sessionPath, client.session.save(), "utf8");
  console.log("Session tersimpan di session.txt");

  await loadDialogs();

  // Load commands
  const commands = new Map();
  const commandsPath = path.join(__dirname, "commands");
  if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));
    for (const file of files) {
      const commandModule = require(path.join(commandsPath, file));
      commands.set(commandModule.command, commandModule.run);
    }
  }

  // Event listener untuk command di saved message
  client.addEventHandler(async (event) => {
    const message = event.message;

    if (!message.message || !message.message.startsWith(".")) return;

    const senderId = parseInt(String(message.senderId).trim());
    const text = message.message.trim();
    const [command, ...args] = text.split(" ");

    const runCommand = commands.get(command);
    if (!runCommand) return;

    if (!whitelistIds.includes(senderId)) {
      return client.sendMessage(message.chatId, {
        message: "Kamu tidak diizinkan menggunakan command ini.",
      });
    }

    try {
      await runCommand({ client, message, args, dialogsCache });
    } catch (err) {
      console.error("Error saat menjalankan command:", err.message);
      await client.sendMessage(message.chatId, {
        message: "Terjadi kesalahan saat menjalankan command.",
      });
    }
  }, new NewMessage({}));

  console.log("Userbot siapmenerima command...");
})();
