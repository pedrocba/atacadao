"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

// Esquema para os dados brutos da nota vindos do Excel (cliente)
const RawNotaSchema = z.object({
  cnpj: z.any(), // Será validado e limpo
  num_nota: z.any(), // Será validado
  valor: z.any(), // Será validado
  data_emissao: z.any(), // Será validado e formatado (esperado dd/MM/yyyy ou serial Excel)
  qtd_fornecedores: z.any(), // Será validado
  codfilial: z.any(), // Será validado
  _originalIndex: z.number().optional(), // Adicionado para rastreamento do cliente
  // Adicione outros campos conforme a planilha Excel
});

export type RawNota = z.infer<typeof RawNotaSchema>;

// Esquema para a nota fiscal pronta para inserção no banco
const NotaFiscalInsertSchema = z.object({
  cnpj: z.string(), // CNPJ do cliente, chave na tabela clientes e FK em notas_fiscais
  num_nota: z.string(),
  valor: z.number(),
  data_emissao: z.string(), // Formato YYYY-MM-DD
  qtd_fornecedores: z.number(), // Ajuste se este campo existir e for necessário na tabela notas_fiscais
  cod_filial: z.number(), // Código da filial (agora obrigatório)
});

export type NotaFiscalInsert = z.infer<typeof NotaFiscalInsertSchema>;

// Tornar ImportacaoResultado exportável
export interface ImportacaoResultado {
  importadasComSucesso: number;
  cnpjsInvalidos: { rawNota: RawNota; erro: string }[];
  notasDuplicadas: RawNota[];
  errosDeValidacao: { rawNota: RawNota; erros: string[] }[];
  errosGerais: string[];
  mensagemSucesso?: string;
}

function limparCnpj(cnpj: any): string {
  return String(cnpj).replace(/\D/g, ""); // Mantém escape para regex
}

function excelSerialToDate(serial: number): Date {
  // Excel: 1 Jan 1900 = 1. JS Date usa epoch diferente.
  // O epoch do Excel é 30 de Dezembro de 1899 para compatibilidade com Lotus 1-2-3.
  return new Date(Date.UTC(1899, 11, 30 + serial));
}

function formatarDataParaISO(dataInput: any): string | null {
  if (!dataInput) return null;

  // Se for número, tentar converter de serial Excel
  if (typeof dataInput === "number") {
    try {
      const data = excelSerialToDate(dataInput);
      return data.toISOString().split("T")[0]; // YYYY-MM-DD
    } catch (e) {
      // Se falhar, tratar como string abaixo
    }
  }

  // Se for string, tentar parsear dd/MM/yyyy
  if (typeof dataInput === "string") {
    const parts = dataInput.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // Mantém escape para regex
    if (parts) {
      const dia = parseInt(parts[1], 10);
      const mes = parseInt(parts[2], 10) - 1; // Mês no JS é 0-indexed
      const ano = parseInt(parts[3], 10);
      const data = new Date(Date.UTC(ano, mes, dia));
      // Validar se a data construída corresponde aos inputs para evitar datas inválidas como 31/02
      if (
        data.getUTCDate() === dia &&
        data.getUTCMonth() === mes &&
        data.getUTCFullYear() === ano
      ) {
        return data.toISOString().split("T")[0]; // YYYY-MM-DD
      }
    }
  }
  return null; // Retorna null se não puder formatar
}

export async function processarImportacaoNotasAction(
  rawNotas: RawNota[]
): Promise<ImportacaoResultado> {
  const supabase = await createClient();
  const resultado: ImportacaoResultado = {
    importadasComSucesso: 0,
    cnpjsInvalidos: [],
    notasDuplicadas: [],
    errosDeValidacao: [],
    errosGerais: [],
  };

  if (!rawNotas || rawNotas.length === 0) {
    resultado.errosGerais.push("Nenhuma nota fornecida para importação.");
    return resultado;
  }

  // 1. Validar formato básico e preparar dados iniciais
  const notasProcessadas: {
    notaOriginal: RawNota;
    cnpjLimpo: string;
    numNotaStr: string;
    valorNum?: number;
    dataEmissaoISO?: string;
    qtdFornecedoresNum?: number;
    cod_filial?: number;
    isValid: boolean;
    errosValidacaoCampos: string[];
  }[] = rawNotas.map((rawNota, index) => {
    const errosCampos: string[] = [];

    const cnpjLimpo = limparCnpj(rawNota.cnpj);
    if (!cnpjLimpo || (cnpjLimpo.length !== 11 && cnpjLimpo.length !== 14)) {
      errosCampos.push(
        'CNPJ "' +
          rawNota.cnpj +
          '" inválido (deve ter 11 ou 14 dígitos numéricos).'
      );
    }

    const numNotaStr = String(rawNota.num_nota).trim();
    if (!numNotaStr || !/^\d+$/.test(numNotaStr)) {
      // Mantém escape para regex
      errosCampos.push(
        'Número da Nota "' +
          rawNota.num_nota +
          '" inválido (deve conter apenas números).'
      );
    }

    let valorNum: number | undefined;
    if (
      rawNota.valor === undefined ||
      rawNota.valor === null ||
      String(rawNota.valor).trim() === ""
    ) {
      errosCampos.push("Valor da Nota é obrigatório.");
    } else {
      valorNum = parseFloat(String(rawNota.valor).replace(",", "."));
      if (isNaN(valorNum)) {
        errosCampos.push('Valor da Nota "' + rawNota.valor + '" inválido.');
      }
    }

    let dataEmissaoISO: string | undefined;
    const dataFormatada = formatarDataParaISO(rawNota.data_emissao);
    if (!dataFormatada) {
      errosCampos.push(
        'Data de Emissão "' +
          rawNota.data_emissao +
          '" inválida ou em formato não suportado (use dd/MM/yyyy ou número serial Excel).'
      );
    } else {
      dataEmissaoISO = dataFormatada;
    }

    // Validação para qtd_fornecedores (exemplo, ajuste conforme sua tabela)
    let qtdFornecedoresNum: number | undefined;
    if (
      rawNota.qtd_fornecedores !== undefined &&
      rawNota.qtd_fornecedores !== null
    ) {
      const parsedQty = parseInt(String(rawNota.qtd_fornecedores), 10);
      if (isNaN(parsedQty) || parsedQty < 0) {
        errosCampos.push(
          'Quantidade de Fornecedores "' +
            rawNota.qtd_fornecedores +
            '" inválida.'
        );
      } else {
        qtdFornecedoresNum = parsedQty;
      }
    } else {
      errosCampos.push("Quantidade de Fornecedores é obrigatória.");
    }

    // Validação para cod_filial
    let cod_filial: number | undefined;
    if (
      rawNota.codfilial === undefined ||
      rawNota.codfilial === null ||
      String(rawNota.codfilial).trim() === ""
    ) {
      errosCampos.push("Código da Filial é obrigatório.");
    } else {
      const parsedCodFilial = parseInt(String(rawNota.codfilial).trim());
      if (isNaN(parsedCodFilial)) {
        errosCampos.push("Código da Filial deve ser um número válido.");
      } else {
        cod_filial = parsedCodFilial;
      }
    }

    if (errosCampos.length > 0) {
      resultado.errosDeValidacao.push({ rawNota, erros: errosCampos });
    }

    return {
      notaOriginal: rawNota,
      cnpjLimpo,
      numNotaStr,
      valorNum,
      dataEmissaoISO,
      qtdFornecedoresNum,
      cod_filial,
      isValid: errosCampos.length === 0,
      errosValidacaoCampos: errosCampos,
    };
  });

  const notasParaValidarExistencia = notasProcessadas.filter((n) => n.isValid);
  if (notasParaValidarExistencia.length === 0) {
    return resultado; // Retorna se todas as notas tiveram erros de formato
  }

  // 2. Validar CNPJs em batch e obter IDs de clientes
  const cnpjsUnicos = Array.from(
    new Set(notasParaValidarExistencia.map((n) => n.cnpjLimpo))
  );

  const { data: clientesDbResult, error: erroClientes } = await supabase.rpc(
    "get_clientes_by_cnpjs",
    { cnpjs_array: cnpjsUnicos }
  );

  if (erroClientes) {
    console.error("Erro ao buscar clientes via RPC:", erroClientes);
    resultado.errosGerais.push(
      "Erro ao consultar clientes no banco: " + erroClientes.message
    );
    return resultado;
  }

  // Definir tipo para o retorno da RPC para clareza
  interface ClienteRpcRetorno {
    cnpj_cliente: string; // A função SQL retorna esta coluna como cnpj_cliente
  }
  const setCnpjsValidosDoBanco = new Set(
    (clientesDbResult as ClienteRpcRetorno[] | null)?.map(
      (c) => c.cnpj_cliente
    ) || []
  );

  const notasComCnpjConfirmado: (NotaFiscalInsert & {
    notaOriginal: RawNota;
  })[] = [];
  notasParaValidarExistencia.forEach((notaProc) => {
    if (!setCnpjsValidosDoBanco.has(notaProc.cnpjLimpo)) {
      resultado.cnpjsInvalidos.push({
        rawNota: notaProc.notaOriginal,
        erro:
          "CNPJ " + notaProc.cnpjLimpo + " não encontrado na base de clientes.",
      });
    } else if (
      notaProc.valorNum !== undefined &&
      notaProc.dataEmissaoISO &&
      notaProc.qtdFornecedoresNum !== undefined // Adicionada checagem para qtdFornecedoresNum
    ) {
      notasComCnpjConfirmado.push({
        notaOriginal: notaProc.notaOriginal,
        cnpj: notaProc.cnpjLimpo,
        num_nota: notaProc.numNotaStr,
        valor: notaProc.valorNum,
        data_emissao: notaProc.dataEmissaoISO,
        qtd_fornecedores: notaProc.qtdFornecedoresNum,
        cod_filial: notaProc.cod_filial!, // Agora é obrigatório
      });
    }
  });

  if (notasComCnpjConfirmado.length === 0) {
    return resultado;
  }

  // 3. Verificar Notas Fiscais existentes em batch
  const idsClientesEnvolvidos = Array.from(
    new Set(notasComCnpjConfirmado.map((n) => n.cnpj)) // Agora é notaComCnpjConfirmado.cnpj
  );
  const { data: notasFiscaisExistentesDb, error: erroNotasExistentes } =
    await supabase
      .from("notas_fiscais")
      .select("num_nota, cnpj") // Selecionar a coluna 'cnpj' da tabela notas_fiscais
      .in("cnpj", idsClientesEnvolvidos); // Filtrar pela coluna 'cnpj' da tabela notas_fiscais

  if (erroNotasExistentes) {
    console.error(
      "Erro ao buscar notas fiscais existentes:",
      erroNotasExistentes
    );
    resultado.errosGerais.push(
      "Erro ao verificar notas existentes: " + erroNotasExistentes.message
    );
    return resultado;
  }

  const setNotasExistentes = new Set(
    notasFiscaisExistentesDb?.map(
      (nf) => nf.cnpj + "_separator_" + nf.num_nota // Usar nf.cnpj
    )
  );

  const notasFinaisParaInserir: NotaFiscalInsert[] = [];
  notasComCnpjConfirmado.forEach((notaComConf) => {
    const chaveExistente =
      notaComConf.cnpj + "_separator_" + notaComConf.num_nota; // Usar notaComConf.cnpj
    if (setNotasExistentes.has(chaveExistente)) {
      resultado.notasDuplicadas.push(notaComConf.notaOriginal);
    } else {
      const { notaOriginal, ...notaParaDb } = notaComConf;
      notasFinaisParaInserir.push(notaParaDb);
    }
  });

  // Determinar se houve erros "graves" antes da tentativa de inserção
  const hasPreInsertionHardErrors =
    resultado.errosDeValidacao.length > 0 ||
    resultado.cnpjsInvalidos.length > 0;

  // 4. Inserir em Batch
  if (notasFinaisParaInserir.length > 0) {
    const { error: erroInsert } = await supabase
      .from("notas_fiscais")
      .insert(notasFinaisParaInserir);

    if (erroInsert) {
      console.error("Erro ao inserir notas fiscais:", erroInsert);
      resultado.errosGerais.push(
        "Erro ao salvar notas no banco: " + erroInsert.message
      );
      // Adicionar as notas que falharam à lista de erros de validação para feedback
      notasFinaisParaInserir.forEach((nf) => {
        const rawNotaOriginal = rawNotas.find(
          (rn) =>
            limparCnpj(rn.cnpj) === nf.cnpj && // Comparar com nf.cnpj
            String(rn.num_nota) === nf.num_nota
        );
        resultado.errosDeValidacao.push({
          rawNota: rawNotaOriginal || {
            cnpj: "Desconhecido",
            num_nota: nf.num_nota,
            valor: nf.valor,
            data_emissao: nf.data_emissao,
            qtd_fornecedores: "N/A", // Considerar como buscar/inferir isso ou ajustar o tipo RawNota
          },
          erros: ["Falha ao inserir no banco de dados."],
        });
      });
    } else {
      resultado.importadasComSucesso = notasFinaisParaInserir.length;
      let msgParts = [
        `${resultado.importadasComSucesso} nota(s) fiscal(is) importada(s) com sucesso.`,
      ];
      if (resultado.notasDuplicadas.length > 0) {
        msgParts.push(
          `${resultado.notasDuplicadas.length} nota(s) já existente(s) foram ignorada(s).`
        );
      }
      resultado.mensagemSucesso = msgParts.join(" ");
    }
  } else {
    // Nenhuma nota foi inserida.
    // Se não houve erros graves de pré-inserção E havia notas brutas processadas E algumas eram duplicatas:
    if (
      !hasPreInsertionHardErrors &&
      rawNotas.length > 0 &&
      resultado.notasDuplicadas.length > 0
    ) {
      resultado.mensagemSucesso = `Nenhuma nota nova para importar. ${resultado.notasDuplicadas.length} nota(s) já existente(s) foram identificada(s) e ignorada(s).`;
      // Limpar erro geral se for apenas sobre "nenhuma nota válida" e a razão foram as duplicatas
      const genericErrorMsg =
        "Nenhuma nota válida para importação após todas as verificações.";
      if (
        resultado.errosGerais.includes(genericErrorMsg) &&
        resultado.errosDeValidacao.length === 0 &&
        resultado.cnpjsInvalidos.length === 0
      ) {
        resultado.errosGerais = resultado.errosGerais.filter(
          (e) => e !== genericErrorMsg
        );
      }
    } else if (
      rawNotas.length > 0 &&
      !hasPreInsertionHardErrors &&
      resultado.notasDuplicadas.length === 0 &&
      resultado.errosDeValidacao.length === 0 &&
      resultado.cnpjsInvalidos.length === 0
    ) {
      // Caso raro: Nenhuma nota para inserir, sem erros de validação, sem CNPJs inválidos, sem duplicatas, mas havia notas.
      // Isso pode significar que todas as notas foram filtradas por alguma razão não explicitamente capturada como erro (improvável com a lógica atual)
      // ou o array rawNotas estava vazio após o filtro inicial do cliente.
      // Se resultado.errosGerais estiver vazio, esta mensagem será mostrada.
      if (resultado.errosGerais.length === 0) {
        resultado.errosGerais.push(
          "Nenhuma nota processada ou todas as notas foram filtradas antes da validação final."
        );
      }
    }
    // Se hasPreInsertionHardErrors for true, a ausência de mensagemSucesso fará com que os erros existentes sejam o foco.
  }

  return resultado;
}
