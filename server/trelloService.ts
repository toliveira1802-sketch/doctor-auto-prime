/**
 * Trello Service - Doctor Auto Prime
 * Busca cards da coluna "Entregue" e gera planilha Excel para importação
 */
import * as XLSX from "xlsx";

const TRELLO_API_KEY = process.env.TRELLO_API_KEY || "";
const TRELLO_TOKEN = process.env.TRELLO_TOKEN || "";
const BOARD_ID = process.env.TRELLO_BOARD_ID || "NkhINjF2";

// IDs das listas do board
const LISTA_ENTREGUE_ID = "695629221d4267bb630620b7"; // 🙏🏻Entregue
const LISTA_FEVEREIRO_ID = "6980d7a43ab1bc89d1b3c400"; // VEICULOS ENTREGUE EM FEVEREIRO

// IDs dos custom fields mapeados
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

export interface TrelloCardProcessed {
  id: string;
  nomeCard: string;
  nomeCliente: string;
  placa: string;
  telefone: string;
  email: string;
  marca: string;
  modelo: string;
  categoria: string;
  valorAprovado: number;
  valorCusto: number;
  margem: number;
  dataEntrada: string;
  previsaoEntrega: string;
  dataEntregaReal: string;
  responsavel: string;
  mecanico: string;
  km: number;
  listaOrigem: string;
}

interface TrelloCard {
  id: string;
  name: string;
  dateLastActivity: string;
  customFieldItems: Array<{
    idCustomField: string;
    value?: { text?: string; number?: string; date?: string };
    idValue?: string;
  }>;
}

interface CustomFieldOption {
  id: string;
  value: { text: string };
}

interface CustomField {
  id: string;
  name: string;
  type: string;
  options?: CustomFieldOption[];
}

async function fetchTrelloAPI(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function getCustomFieldsMap(): Promise<Map<string, CustomField>> {
  const url = `https://api.trello.com/1/boards/${BOARD_ID}/customFields?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
  const fields: CustomField[] = await fetchTrelloAPI(url);
  const map = new Map<string, CustomField>();
  fields.forEach((f) => map.set(f.id, f));
  return map;
}

async function getListCards(listId: string): Promise<TrelloCard[]> {
  const url = `https://api.trello.com/1/lists/${listId}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&customFieldItems=true&fields=name,dateLastActivity,labels,due,dueComplete`;
  return fetchTrelloAPI(url);
}

function getFieldValue(
  card: TrelloCard,
  fieldId: string,
  cfMap: Map<string, CustomField>
): string {
  const item = card.customFieldItems?.find((i) => i.idCustomField === fieldId);
  if (!item) return "";

  // Valor direto (text, number, date)
  if (item.value?.text) return item.value.text;
  if (item.value?.number) return item.value.number;
  if (item.value?.date) return item.value.date;

  // Valor de lista (idValue → opção)
  if (item.idValue) {
    const field = cfMap.get(fieldId);
    const option = field?.options?.find((o) => o.id === item.idValue);
    return option?.value?.text || "";
  }

  return "";
}

function extractPlacaFromName(cardName: string): string {
  // Mercosul: ABC1D23 ou antiga: ABC1234
  const regex = /\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/i;
  const match = cardName.match(regex);
  return match ? match[1].toUpperCase() : "";
}

export async function fetchEntregueCards(incluirFevereiro = true): Promise<TrelloCardProcessed[]> {
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
    throw new Error("Credenciais do Trello não configuradas");
  }

  const cfMap = await getCustomFieldsMap();

  // Busca cards das listas
  const listsToFetch = [LISTA_ENTREGUE_ID];
  if (incluirFevereiro) listsToFetch.push(LISTA_FEVEREIRO_ID);

  const allCards: Array<TrelloCard & { listaOrigem: string }> = [];

  for (const listId of listsToFetch) {
    const cards = await getListCards(listId);
    const listName =
      listId === LISTA_ENTREGUE_ID
        ? "Entregue"
        : "Entregue Fevereiro";
    cards.forEach((c) => allCards.push({ ...c, listaOrigem: listName }));
  }

  // Processa cada card
  const processed: TrelloCardProcessed[] = allCards.map((card) => {
    const valorAprovado = parseFloat(getFieldValue(card, CF.VALOR_APROVADO, cfMap) || "0");
    const valorCusto = parseFloat(getFieldValue(card, CF.VALOR_CUSTO, cfMap) || "0");
    const margem =
      valorAprovado > 0 && valorCusto > 0
        ? Math.round(((valorAprovado - valorCusto) / valorAprovado) * 100)
        : 0;

    const placaField = getFieldValue(card, CF.PLACA, cfMap);
    const placa = placaField || extractPlacaFromName(card.name);

    const dataEntradaRaw = getFieldValue(card, CF.DATA_ENTRADA, cfMap);
    const dataEntrada = dataEntradaRaw
      ? new Date(dataEntradaRaw).toLocaleDateString("pt-BR")
      : "";

    const previsaoRaw = getFieldValue(card, CF.PREVISAO_ENTREGA, cfMap);
    const previsaoEntrega = previsaoRaw
      ? new Date(previsaoRaw).toLocaleDateString("pt-BR")
      : "";

    const dataEntregaReal = card.dateLastActivity
      ? new Date(card.dateLastActivity).toLocaleDateString("pt-BR")
      : "";

    return {
      id: card.id,
      nomeCard: card.name,
      nomeCliente: getFieldValue(card, CF.NOME_CLIENTE, cfMap),
      placa: placa.toUpperCase(),
      telefone: getFieldValue(card, CF.TELEFONE, cfMap),
      email: getFieldValue(card, CF.EMAIL, cfMap),
      marca: getFieldValue(card, CF.MARCA, cfMap),
      modelo: getFieldValue(card, CF.MODELO, cfMap),
      categoria: getFieldValue(card, CF.CATEGORIA, cfMap),
      valorAprovado,
      valorCusto,
      margem,
      dataEntrada,
      previsaoEntrega,
      dataEntregaReal,
      responsavel: getFieldValue(card, CF.RESPONSAVEL, cfMap),
      mecanico: getFieldValue(card, CF.MECANICO, cfMap),
      km: parseInt(getFieldValue(card, CF.KM, cfMap) || "0"),
      listaOrigem: card.listaOrigem,
    };
  });

  // Ordena por data de entrega (mais recente primeiro)
  return processed.sort((a, b) => {
    const da = a.dataEntregaReal ? new Date(a.dataEntregaReal.split("/").reverse().join("-")).getTime() : 0;
    const db = b.dataEntregaReal ? new Date(b.dataEntregaReal.split("/").reverse().join("-")).getTime() : 0;
    return db - da;
  });
}

export function generateExcelBuffer(cards: TrelloCardProcessed[]): Buffer {
  const wb = XLSX.utils.book_new();

  // ── Aba 1: Dados Completos ──────────────────────────────────────────────────
  const headers = [
    "Placa",
    "Nome Cliente",
    "Telefone",
    "Email",
    "Marca",
    "Modelo",
    "Categoria",
    "Mecânico",
    "Responsável Técnico",
    "KM",
    "Data Entrada",
    "Previsão Entrega",
    "Data Entrega Real",
    "Valor Aprovado (R$)",
    "Valor Custo (R$)",
    "Margem (%)",
    "Lista Origem",
    "Nome Card Trello",
  ];

  const rows = cards.map((c) => [
    c.placa,
    c.nomeCliente,
    c.telefone,
    c.email,
    c.marca,
    c.modelo,
    c.categoria,
    c.mecanico,
    c.responsavel,
    c.km || "",
    c.dataEntrada,
    c.previsaoEntrega,
    c.dataEntregaReal,
    c.valorAprovado || "",
    c.valorCusto || "",
    c.margem ? `${c.margem}%` : "",
    c.listaOrigem,
    c.nomeCard,
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Larguras das colunas
  ws1["!cols"] = [
    { wch: 12 }, { wch: 25 }, { wch: 16 }, { wch: 28 },
    { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 14 },
    { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
    { wch: 20 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Veículos Entregues");

  // ── Aba 2: Resumo por Mecânico ──────────────────────────────────────────────
  const mecanicoMap = new Map<string, { qtd: number; valorTotal: number; valorCusto: number }>();
  cards.forEach((c) => {
    const nome = c.mecanico || "Sem mecânico";
    const curr = mecanicoMap.get(nome) || { qtd: 0, valorTotal: 0, valorCusto: 0 };
    mecanicoMap.set(nome, {
      qtd: curr.qtd + 1,
      valorTotal: curr.valorTotal + c.valorAprovado,
      valorCusto: curr.valorCusto + c.valorCusto,
    });
  });

  const mecRows = Array.from(mecanicoMap.entries())
    .sort((a, b) => b[1].valorTotal - a[1].valorTotal)
    .map(([nome, stats]) => {
      const margem =
        stats.valorTotal > 0 && stats.valorCusto > 0
          ? Math.round(((stats.valorTotal - stats.valorCusto) / stats.valorTotal) * 100)
          : 0;
      return [
        nome,
        stats.qtd,
        stats.valorTotal.toFixed(2),
        stats.valorCusto.toFixed(2),
        `${margem}%`,
        stats.qtd > 0 ? (stats.valorTotal / stats.qtd).toFixed(2) : "0",
      ];
    });

  const ws2 = XLSX.utils.aoa_to_sheet([
    ["Mecânico", "Qtd OS", "Faturamento (R$)", "Custo (R$)", "Margem (%)", "Ticket Médio (R$)"],
    ...mecRows,
  ]);
  ws2["!cols"] = [{ wch: 18 }, { wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Ranking Mecânicos");

  // ── Aba 3: Resumo por Responsável ───────────────────────────────────────────
  const respMap = new Map<string, { qtd: number; valorTotal: number }>();
  cards.forEach((c) => {
    const nome = c.responsavel || "Sem responsável";
    const curr = respMap.get(nome) || { qtd: 0, valorTotal: 0 };
    respMap.set(nome, { qtd: curr.qtd + 1, valorTotal: curr.valorTotal + c.valorAprovado });
  });

  const respRows = Array.from(respMap.entries())
    .sort((a, b) => b[1].valorTotal - a[1].valorTotal)
    .map(([nome, stats]) => [
      nome,
      stats.qtd,
      stats.valorTotal.toFixed(2),
      stats.qtd > 0 ? (stats.valorTotal / stats.qtd).toFixed(2) : "0",
    ]);

  const ws3 = XLSX.utils.aoa_to_sheet([
    ["Responsável", "Qtd OS", "Faturamento (R$)", "Ticket Médio (R$)"],
    ...respRows,
  ]);
  ws3["!cols"] = [{ wch: 18 }, { wch: 8 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Ranking Consultores");

  // ── Aba 4: Resumo por Marca ─────────────────────────────────────────────────
  const marcaMap = new Map<string, { qtd: number; valorTotal: number }>();
  cards.forEach((c) => {
    const marca = c.marca || "Sem marca";
    const curr = marcaMap.get(marca) || { qtd: 0, valorTotal: 0 };
    marcaMap.set(marca, { qtd: curr.qtd + 1, valorTotal: curr.valorTotal + c.valorAprovado });
  });

  const marcaRows = Array.from(marcaMap.entries())
    .sort((a, b) => b[1].qtd - a[1].qtd)
    .map(([marca, stats]) => [
      marca,
      stats.qtd,
      stats.valorTotal.toFixed(2),
      stats.qtd > 0 ? (stats.valorTotal / stats.qtd).toFixed(2) : "0",
    ]);

  const ws4 = XLSX.utils.aoa_to_sheet([
    ["Marca", "Qtd OS", "Faturamento (R$)", "Ticket Médio (R$)"],
    ...marcaRows,
  ]);
  ws4["!cols"] = [{ wch: 16 }, { wch: 8 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws4, "Mix por Marca");

  // ── Aba 5: Totais Gerais ────────────────────────────────────────────────────
  const totalFat = cards.reduce((s, c) => s + c.valorAprovado, 0);
  const totalCusto = cards.reduce((s, c) => s + c.valorCusto, 0);
  const totalMargem = totalFat > 0 ? Math.round(((totalFat - totalCusto) / totalFat) * 100) : 0;
  const ticketMedio = cards.length > 0 ? totalFat / cards.length : 0;
  const cardsComValor = cards.filter((c) => c.valorAprovado > 0).length;

  const ws5 = XLSX.utils.aoa_to_sheet([
    ["Resumo Geral - Veículos Entregues"],
    [""],
    ["Métrica", "Valor"],
    ["Total de OS", cards.length],
    ["OS com valor registrado", cardsComValor],
    ["Faturamento Total (R$)", totalFat.toFixed(2)],
    ["Custo Total (R$)", totalCusto.toFixed(2)],
    ["Margem Média (%)", `${totalMargem}%`],
    ["Ticket Médio (R$)", ticketMedio.toFixed(2)],
    [""],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    ["Fonte", "Trello - Doctor Auto Prime"],
  ]);
  ws5["!cols"] = [{ wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws5, "Totais");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// ── Estatísticas rápidas sem gerar Excel ────────────────────────────────────
export function calcStats(cards: TrelloCardProcessed[]) {
  const totalFat = cards.reduce((s, c) => s + c.valorAprovado, 0);
  const totalCusto = cards.reduce((s, c) => s + c.valorCusto, 0);
  const margem = totalFat > 0 ? Math.round(((totalFat - totalCusto) / totalFat) * 100) : 0;
  const ticketMedio = cards.length > 0 ? totalFat / cards.length : 0;

  const mecanicoMap = new Map<string, { qtd: number; valor: number }>();
  cards.forEach((c) => {
    const nome = c.mecanico || "Sem mecânico";
    const curr = mecanicoMap.get(nome) || { qtd: 0, valor: 0 };
    mecanicoMap.set(nome, { qtd: curr.qtd + 1, valor: curr.valor + c.valorAprovado });
  });

  const rankingMecanicos = Array.from(mecanicoMap.entries())
    .sort((a, b) => b[1].qtd - a[1].qtd)
    .map(([nome, s]) => ({ nome, qtd: s.qtd, valor: s.valor }));

  const marcaMap = new Map<string, number>();
  cards.forEach((c) => {
    const marca = c.marca || "Outros";
    marcaMap.set(marca, (marcaMap.get(marca) || 0) + 1);
  });
  const mixMarcas = Array.from(marcaMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([marca, qtd]) => ({ marca, qtd }));

  return {
    totalOS: cards.length,
    totalFaturamento: totalFat,
    totalCusto,
    margemMedia: margem,
    ticketMedio,
    rankingMecanicos,
    mixMarcas,
  };
}
