/**
 * Script de execução manual do cron job Trello
 * Busca cards da coluna "Entregues", calcula stats e gera planilha Excel no S3
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root
import { config } from "dotenv";
config({ path: join(__dirname, "../.env") });

const TRELLO_API_KEY = process.env.TRELLO_API_KEY || "";
const TRELLO_TOKEN = process.env.TRELLO_TOKEN || "";
const BOARD_ID = process.env.TRELLO_BOARD_ID || "NkhINjF2";

// IDs das listas
const LISTA_ENTREGUE_ID = "695629221d4267bb630620b7";
const LISTA_FEVEREIRO_ID = "6980d7a43ab1bc89d1b3c400";

// Custom field IDs
const CF = {
  NOME_CLIENTE: "6956da55d02a45dbc3631d00",
  PLACA: "6956292544e9a6239dd2d8df",
  TELEFONE: "6980ea47f4f29c2a542b74ea",
  MARCA: "6956da57217e1f5188ff184a",
  MODELO: "69562925aa519de1067271dd",
  CATEGORIA: "69562924e81589c5248b5653",
  VALOR_APROVADO: "6956da5a9678ba405f675266",
  VALOR_CUSTO: "69587bbb77e9c4de28d7b2df",
  DATA_ENTRADA: "6956da66bd77b3dc2271ad4b",
  PREVISAO_ENTREGA: "6956da77729f80b656c5d739",
  RESPONSAVEL: "6956da71b35e08a0e07fd952",
  MECANICO: "6956eb8ce868bb88f023a1c0",
  KM: "696268c5ce6141e8f81ac730",
  EMAIL: "69653af5610dd6cbefa4a81c",
};

function getCustomFieldValue(customFieldItems, fieldId) {
  const field = customFieldItems?.find((f) => f.idCustomField === fieldId);
  if (!field) return "";
  if (field.value?.text) return field.value.text;
  if (field.value?.number !== undefined) return field.value.number;
  if (field.value?.date) return field.value.date;
  return "";
}

async function fetchCards(listId, listaNome) {
  const url = `https://api.trello.com/1/lists/${listId}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&customFieldItems=true&fields=id,name,dateLastActivity,due`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Erro ao buscar lista ${listaNome}: ${res.status}`);
    return [];
  }
  const cards = await res.json();
  console.log(`  ✓ ${listaNome}: ${cards.length} cards`);
  return cards.map((card) => {
    const cf = card.customFieldItems || [];
    const valorAprovado = parseFloat(getCustomFieldValue(cf, CF.VALOR_APROVADO)) || 0;
    const valorCusto = parseFloat(getCustomFieldValue(cf, CF.VALOR_CUSTO)) || 0;
    const margem = valorAprovado > 0 ? ((valorAprovado - valorCusto) / valorAprovado) * 100 : 0;
    return {
      id: card.id,
      nomeCard: card.name,
      nomeCliente: getCustomFieldValue(cf, CF.NOME_CLIENTE),
      placa: getCustomFieldValue(cf, CF.PLACA),
      telefone: getCustomFieldValue(cf, CF.TELEFONE),
      email: getCustomFieldValue(cf, CF.EMAIL),
      marca: getCustomFieldValue(cf, CF.MARCA),
      modelo: getCustomFieldValue(cf, CF.MODELO),
      categoria: getCustomFieldValue(cf, CF.CATEGORIA),
      valorAprovado,
      valorCusto,
      margem: parseFloat(margem.toFixed(2)),
      dataEntrada: getCustomFieldValue(cf, CF.DATA_ENTRADA),
      previsaoEntrega: getCustomFieldValue(cf, CF.PREVISAO_ENTREGA),
      dataEntregaReal: card.due || card.dateLastActivity || "",
      responsavel: getCustomFieldValue(cf, CF.RESPONSAVEL),
      mecanico: getCustomFieldValue(cf, CF.MECANICO),
      km: getCustomFieldValue(cf, CF.KM),
      listaOrigem: listaNome,
    };
  });
}

async function main() {
  console.log("🚀 Doctor Auto Prime — Trello Sync");
  console.log("=====================================");
  console.log(`Board: ${BOARD_ID}`);
  console.log(`API Key: ${TRELLO_API_KEY ? "✓ OK" : "✗ MISSING"}`);
  console.log(`Token: ${TRELLO_TOKEN ? "✓ OK" : "✗ MISSING"}`);
  console.log("");

  if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
    console.error("❌ Credenciais do Trello não configuradas!");
    process.exit(1);
  }

  console.log("📋 Buscando cards...");
  const [cardsEntregue, cardsFevereiro] = await Promise.all([
    fetchCards(LISTA_ENTREGUE_ID, "Entregue"),
    fetchCards(LISTA_FEVEREIRO_ID, "Entregue Fevereiro"),
  ]);

  const allCards = [...cardsEntregue, ...cardsFevereiro];
  console.log(`\n📊 Total: ${allCards.length} cards`);

  // Calcular stats
  const totalFaturamento = allCards.reduce((s, c) => s + c.valorAprovado, 0);
  const totalCusto = allCards.reduce((s, c) => s + c.valorCusto, 0);
  const ticketMedio = allCards.length > 0 ? totalFaturamento / allCards.length : 0;
  const margemMedia = allCards.length > 0
    ? allCards.reduce((s, c) => s + c.margem, 0) / allCards.length
    : 0;

  // Por mecânico
  const mecanicoMap = {};
  allCards.forEach((c) => {
    const nome = c.mecanico || "Sem mecânico";
    if (!mecanicoMap[nome]) mecanicoMap[nome] = { nome, count: 0, faturamento: 0 };
    mecanicoMap[nome].count++;
    mecanicoMap[nome].faturamento += c.valorAprovado;
  });
  const rankingMecanicos = Object.values(mecanicoMap).sort((a, b) => b.count - a.count);

  // Por categoria
  const categoriaMap = {};
  allCards.forEach((c) => {
    const cat = c.categoria || "Sem categoria";
    if (!categoriaMap[cat]) categoriaMap[cat] = { categoria: cat, count: 0, faturamento: 0 };
    categoriaMap[cat].count++;
    categoriaMap[cat].faturamento += c.valorAprovado;
  });

  console.log("\n💰 RESUMO FINANCEIRO");
  console.log("─────────────────────────────────────");
  console.log(`Faturamento Total:  R$ ${totalFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`Custo Total:        R$ ${totalCusto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`Lucro Bruto:        R$ ${(totalFaturamento - totalCusto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`Ticket Médio:       R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`Margem Média:       ${margemMedia.toFixed(1)}%`);

  console.log("\n🔧 RANKING MECÂNICOS");
  console.log("─────────────────────────────────────");
  rankingMecanicos.forEach((m, i) => {
    console.log(`${i + 1}. ${m.nome}: ${m.count} OS | R$ ${m.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  });

  console.log("\n🏷️ POR CATEGORIA");
  console.log("─────────────────────────────────────");
  Object.values(categoriaMap).sort((a, b) => b.count - a.count).forEach((c) => {
    console.log(`${c.categoria}: ${c.count} OS | R$ ${c.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  });

  // Gerar Excel
  console.log("\n📊 Gerando planilha Excel...");
  const { default: XLSX } = await import("xlsx");

  const wsData = [
    ["ID Card", "Nome Card", "Nome Cliente", "Placa", "Telefone", "Email", "Marca", "Modelo",
     "Categoria", "Valor Aprovado (R$)", "Valor Custo (R$)", "Margem (%)", "Data Entrada",
     "Previsão Entrega", "Data Entrega Real", "Responsável", "Mecânico", "KM", "Lista Origem"],
    ...allCards.map((c) => [
      c.id, c.nomeCard, c.nomeCliente, c.placa, c.telefone, c.email, c.marca, c.modelo,
      c.categoria, c.valorAprovado, c.valorCusto, c.margem, c.dataEntrada,
      c.previsaoEntrega, c.dataEntregaReal, c.responsavel, c.mecanico, c.km, c.listaOrigem,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Entregues");

  // Aba de Resumo
  const wsResumo = XLSX.utils.aoa_to_sheet([
    ["RESUMO GERAL"],
    [""],
    ["Total de OS", allCards.length],
    ["Faturamento Total", totalFaturamento],
    ["Custo Total", totalCusto],
    ["Lucro Bruto", totalFaturamento - totalCusto],
    ["Ticket Médio", parseFloat(ticketMedio.toFixed(2))],
    ["Margem Média (%)", parseFloat(margemMedia.toFixed(1))],
    [""],
    ["RANKING MECÂNICOS"],
    ["Mecânico", "OS", "Faturamento"],
    ...rankingMecanicos.map((m) => [m.nome, m.count, m.faturamento]),
    [""],
    ["POR CATEGORIA"],
    ["Categoria", "OS", "Faturamento"],
    ...Object.values(categoriaMap).sort((a, b) => b.count - a.count).map((c) => [c.categoria, c.count, c.faturamento]),
  ]);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputPath = `/home/ubuntu/webdev-static-assets/trello-entregues-${timestamp}.xlsx`;

  // Ensure directory exists
  const { mkdirSync } = await import("fs");
  mkdirSync("/home/ubuntu/webdev-static-assets", { recursive: true });

  XLSX.writeFile(wb, outputPath);
  console.log(`✅ Planilha salva: ${outputPath}`);
  console.log(`   ${allCards.length} registros | ${wsData.length - 1} linhas de dados`);

  console.log("\n✅ Sync concluído com sucesso!");
  return { outputPath, totalCards: allCards.length, totalFaturamento, ticketMedio, margemMedia };
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
