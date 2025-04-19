const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const connectDB = require("./database/connect");

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const sessionPath = "session.txt";

let stringSession = fs.existsSync(sessionPath)
  ? new StringSession(fs.readFileSync(sessionPath, "utf8"))
  : new StringSession("");

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

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
  const db = await connectDB();
  const pmCollection = db.collection("pm_messages");
  const statusCollection = db.collection("pm_status");
  const historyCollection = db.collection("pm_history");

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

  const commands = new Map();
  const commandsPath = path.join(__dirname, "commands");
  if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));
    for (const file of files) {
      const commandModule = require(path.join(commandsPath, file));
      commands.set(commandModule.command, commandModule.run);
    }
  }

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
      await runCommand({ client, message, args, dialogsCache, pmCollection, statusCollection });
    } catch (err) {
      console.error("Error saat menjalankan command:", err.message);
      await client.sendMessage(message.chatId, {
        message: "Terjadi kesalahan saat menjalankan command.",
      });
    }
  }, new NewMessage({}));

  // Auto-PM Handler
  client.addEventHandler(async (event) => {
    const msg = event.message;
    const senderId = msg.senderId?.value;
    if (!senderId || msg.out || msg.isChannel || msg.isGroup) return;

    const status = await statusCollection.findOne({ _id: "pm_status" });
    if (!status || status.status !== "on") return;

    const history = await historyCollection.findOne({ userId: senderId });
    const now = Date.now();

    if (history && now - history.lastReply < 24 * 60 * 60 * 1000) return;

    const lastMessage = await pmCollection.findOne({}, { sort: { _id: -1 } });
    if (!lastMessage) return;

    try {
      await client.sendMessage(senderId, {
        message: lastMessage.text,
        parseMode: "html",
        ...(lastMessage.replyMarkup ? { replyMarkup: lastMessage.replyMarkup } : {}),
      });

      await historyCollection.updateOne(
        { userId: senderId },
        { $set: { userId: senderId, lastReply: now } },
        { upsert: true }
      );
    } catch (err) {
      console.error("Gagal kirim PM:", err.message);
    }
  }, new NewMessage({ incoming: true }));

  console.log("Userbot siap menerima command...");
})();
