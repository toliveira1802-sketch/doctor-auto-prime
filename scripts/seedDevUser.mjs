/**
 * Seed Script — Create Dev Master User
 * Creates the Dev_thales user with bcrypt-hashed password T060925@
 *
 * Usage: node scripts/seedDevUser.mjs
 * Requires: DATABASE_URL environment variable
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Hash the Dev master password
    const hashedPassword = await bcrypt.hash("T060925@", 10);

    // Check if user already exists
    const [existing] = await connection.execute(
      "SELECT id FROM `01_colaboradores` WHERE username = ?",
      ["Dev_thales"]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing user
      await connection.execute(
        `UPDATE \`01_colaboradores\` SET
          senha = ?,
          primeiroAcesso = false,
          nivelAcessoId = 1,
          ativo = true,
          failedAttempts = 0,
          lockedUntil = NULL
        WHERE username = ?`,
        [hashedPassword, "Dev_thales"]
      );
      console.log("✓ Dev_thales user updated with bcrypt password");
    } else {
      // Insert new user
      await connection.execute(
        `INSERT INTO \`01_colaboradores\`
          (empresaId, nome, cargo, username, senha, primeiroAcesso, nivelAcessoId, ativo, failedAttempts)
        VALUES (1, 'Thales Oliveira', 'Desenvolvedor', 'Dev_thales', ?, false, 1, true, 0)`,
        [hashedPassword]
      );
      console.log("✓ Dev_thales user created with bcrypt password");
    }

    // Ensure the 02_nivelDeAcesso table has the correct entries
    const levels = [
      { id: 1, tipoUsuario: "Dev", nivelAcesso: 10 },
      { id: 2, tipoUsuario: "Gestão", nivelAcesso: 8 },
      { id: 3, tipoUsuario: "Consultor", nivelAcesso: 5 },
      { id: 4, tipoUsuario: "Mecânico", nivelAcesso: 2 },
      { id: 5, tipoUsuario: "Cliente", nivelAcesso: 1 },
    ];

    for (const level of levels) {
      await connection.execute(
        `INSERT INTO \`02_nivelDeAcesso\` (id, tipoUsuario, nivelAcesso)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE tipoUsuario = VALUES(tipoUsuario), nivelAcesso = VALUES(nivelAcesso)`,
        [level.id, level.tipoUsuario, level.nivelAcesso]
      );
    }
    console.log("✓ Access levels seeded");

    console.log("\n✅ Seed complete!");
    console.log("   Dev login: Dev_thales / T060925@");
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
