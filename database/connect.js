const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

if (!uri) {
  throw new Error("MONGO_URI tidak ditemukan di .env");
}

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;
async function connectDB() {
  if (!db) {
    try {
      await client.connect();
      db = client.db(dbName);
      console.log("Terhubung ke MongoDB");
    } catch (error) {
      console.error("Gagal konek MongoDB:", error);
    }
  }
  return db;
}

module.exports = connectDB;
