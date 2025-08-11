import mysql from "mysql2/promise";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = await yargs(hideBin(process.argv))
  .options({
    count: {
      type: "number",
      default: 15,
      describe: "Jumlah materi dummy yang ingin dibuat",
    },
    reset: {
      type: "boolean",
      default: false,
      describe: "Hapus semua data materi sebelum seeding",
    },
  })
  .parse();

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fungsi untuk mendapatkan tanggal random antara start dan end
function getRandomDate(start: Date, end: Date): string {
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return date.toISOString().split("T")[0];
}

async function seed() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "marcom",
  });

  console.log("✅ Connected to database");

  // Reset data
  if (argv.reset) {
    console.log(
      "⚠️ Resetting materi, dokumen_materi, dokumen_materi_keyword..."
    );
    await connection.query("DELETE FROM dokumen_materi_keyword");
    await connection.query("DELETE FROM dokumen_materi");
    await connection.query("DELETE FROM materi");
  }

  // Insert brand
  const brands = ["BRImo", "BRImerchant", "BRIZZI"];
  for (const name of brands) {
    await connection.query(
      `
      INSERT INTO brand (name)
      SELECT * FROM (SELECT ? AS name) AS tmp
      WHERE NOT EXISTS (SELECT name FROM brand WHERE name = ?) LIMIT 1;
    `,
      [name, name]
    );
  }

  // Insert clusters
  const clusters = ["Bayar-Bayar Harian", "Bayar-Bayar Bulanan", "Tagihan"];
  for (const name of clusters) {
    await connection.query(
      `
      INSERT INTO cluster (name)
      SELECT * FROM (SELECT ? AS name) AS tmp
      WHERE NOT EXISTS (SELECT name FROM cluster WHERE name = ?) LIMIT 1;
    `,
      [name, name]
    );
  }

  // Insert fitur
  const fiturList = ["Donasi", "QRIS Source CC", "Transfer Internasional"];
  for (const name of fiturList) {
    await connection.query(
      `
      INSERT INTO fitur (name)
      SELECT * FROM (SELECT ? AS name) AS tmp
      WHERE NOT EXISTS (SELECT name FROM fitur WHERE name = ?) LIMIT 1;
    `,
      [name, name]
    );
  }

  // Insert jenis
  const jenisList = ["Tematik", "Tactical"];
  for (const name of jenisList) {
    await connection.query(
      `
      INSERT INTO jenis (name)
      SELECT * FROM (SELECT ? AS name) AS tmp
      WHERE NOT EXISTS (SELECT name FROM jenis WHERE name = ?) LIMIT 1;
    `,
      [name, name]
    );
  }

  const userId = 1;
  const [brandRows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM brand`
  );
  const [clusterRows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM cluster`
  );
  const [fiturRows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM fitur`
  );
  const [jenisRows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM jenis`
  );

  const keywordsPool = [
    "donasi",
    "promo",
    "panduan",
    "brimo",
    "qris",
    "transfer",
    "internasional",
    "diskon",
    "voucher",
    "cc",
  ];
  const tipeMateriList = ["Key Visual", "TVC", "Video"];
  const sharedLink =
    "https://drive.google.com/drive/folders/1pbrK2t5lo0O7R6-YRw1Dv84hlhSpinr9?usp=sharing";

  for (let i = 1; i <= argv.count; i++) {
    const brand = getRandom(brandRows);
    const cluster = getRandom(clusterRows);
    const fitur = getRandom(fiturRows);
    const jenis = getRandom(jenisRows);

    // Random bulan dari Juli (6) sampai Desember (11)
    const startDate = getRandomDate(
      new Date(2025, 6, 1),
      new Date(2025, 11, 31)
    );
    const endDate = getRandomDate(new Date(2025, 6, 1), new Date(2025, 11, 31));

    const namaMateri = `Materi ${i} - ${getRandom([
      "Donasi",
      "QRIS",
      "Transfer",
    ])}`;
    const periode = "0";
    const tipeMateri = getRandom(tipeMateriList);

    // Insert materi
    const [result] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO materi (user_id, brand_id, cluster_id, fitur_id, jenis_id, nama_materi, start_date, end_date, periode)
      SELECT * FROM (
        SELECT 
          ? AS user_id,
          ? AS brand_id,
          ? AS cluster_id,
          ? AS fitur_id,
          ? AS jenis_id,
          ? AS nama_materi,
          ? AS start_date,
          ? AS end_date,
          ? AS periode
      ) AS tmp
      WHERE NOT EXISTS (SELECT nama_materi FROM materi WHERE nama_materi = ?) LIMIT 1;
    `,
      [
        userId,
        brand.id,
        cluster.id,
        fitur.id,
        jenis.id,
        namaMateri,
        startDate,
        endDate,
        periode,
        namaMateri,
      ]
    );

    const materiId =
      result.insertId ||
      (
        await connection.query<RowDataPacket[]>(
          `SELECT id FROM materi WHERE nama_materi = ?`,
          [namaMateri]
        )
      )[0][0].id;

    // Insert dokumen_materi
    const [docResult] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO dokumen_materi (materi_id, link_dokumen, tipe_materi, thumbnail)
      SELECT * FROM (
        SELECT 
          ? AS materi_id,
          ? AS link_dokumen,
          ? AS tipe_materi,
          ? AS thumbnail
      ) AS tmp
      WHERE NOT EXISTS (SELECT materi_id FROM dokumen_materi WHERE materi_id = ?) LIMIT 1;
    `,
      [
        materiId,
        sharedLink,
        tipeMateri,
        "4d2114b7-8f46-476a-9ddc-e8b85e967937.png",
        materiId,
      ]
    );

    const dokumenId =
      docResult.insertId ||
      (
        await connection.query<RowDataPacket[]>(
          `SELECT id FROM dokumen_materi WHERE materi_id = ?`,
          [materiId]
        )
      )[0][0].id;

    // Insert keywords
    const shuffledKeywords = [...keywordsPool]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    for (const keyword of shuffledKeywords) {
      await connection.query(
        `
        INSERT INTO dokumen_materi_keyword (dokumen_materi_id, keyword)
        SELECT * FROM (
          SELECT 
            ? AS dokumen_materi_id,
            ? AS keyword
        ) AS tmp
        WHERE NOT EXISTS (SELECT 1 FROM dokumen_materi_keyword WHERE dokumen_materi_id = ? AND keyword = ?) LIMIT 1;
      `,
        [dokumenId, keyword, dokumenId, keyword]
      );
    }
  }

  console.log(`✅ Seeder berhasil: ${argv.count} materi dummy diisi lengkap.`);
  await connection.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
