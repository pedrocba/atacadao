"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Esquema para os dados brutos do cliente vindos do Excel
const RawClienteSchema = z.object({
  cnpj: z.any(), // Será validado e limpo
  razao_social: z.any(), // Será validado
  nome_fantasia: z.any().optional(), // Opcional
});

export type RawCliente = z.infer<typeof RawClienteSchema>;

// Esquema para o cliente pronto para inserção no banco
const ClienteInsertSchema = z.object({
  cnpj: z.string(),
  razao_social: z.string().min(1, "Razão Social é obrigatória."),
  nome_fantasia: z.string().nullable().optional(), // Pode ser null ou string
});

export type ClienteInsert = z.infer<typeof ClienteInsertSchema>;

interface ImportacaoResultadoClientes {
  importadosComSucesso: number;
  cnpjsDuplicados: RawCliente[]; // Duplicados em relação ao BD
  cnpjsDuplicadosNoArquivo: RawCliente[]; // Duplicados dentro do próprio arquivo Excel
  errosDeValidacao: { rawCliente: RawCliente; erros: string[] }[];
  errosGerais: string[];
  mensagemSucesso?: string;
}

function limparCnpj(cnpj: any): string {
  return String(cnpj).replace(/\D/g, "");
}

export async function processarImportacaoClientesAction(
  rawClientes: RawCliente[]
): Promise<ImportacaoResultadoClientes> {
  const supabase = await createClient();
  const resultado: ImportacaoResultadoClientes = {
    importadosComSucesso: 0,
    cnpjsDuplicados: [],
    cnpjsDuplicadosNoArquivo: [],
    errosDeValidacao: [],
    errosGerais: [],
  };

  if (!rawClientes || rawClientes.length === 0) {
    resultado.errosGerais.push("Nenhum cliente fornecido para importação.");
    return resultado;
  }

  // 0. Verificar permissão do usuário (Admin) - crucial!
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    resultado.errosGerais.push("Usuário não autenticado.");
    return resultado;
  }

  const { data: adminData, error: adminError } = await supabase
    .from("usuarios")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminError || !adminData || adminData.role !== "admin") {
    resultado.errosGerais.push(
      "Permissão negada. Somente administradores podem importar clientes."
    );
    return resultado;
  }

  // 1. Validar formato básico e preparar dados iniciais
  const clientesProcessadosInicialmente: { // Renomeado para clareza
    clienteOriginal: RawCliente;
    cnpjLimpo: string;
    razaoSocialStr?: string;
    nomeFantasiaStr?: string | null;
    isValid: boolean;
    errosValidacaoCampos: string[];
  }[] = rawClientes.map((rawCliente) => {
    const errosCampos: string[] = [];

    const cnpjLimpo = limparCnpj(rawCliente.cnpj);
    if (cnpjLimpo.length < 5) {
      errosCampos.push(
        `CNPJ "${rawCliente.cnpj}" inválido.`
      );
    }

    const razaoSocialStr = String(rawCliente.razao_social || "").trim();
    if (!razaoSocialStr) {
      errosCampos.push("Razão Social é obrigatória.");
    }

    const nomeFantasiaStr =
      rawCliente.nome_fantasia !== undefined && rawCliente.nome_fantasia !== null
        ? String(rawCliente.nome_fantasia).trim()
        : null;

    if (errosCampos.length > 0) {
      resultado.errosDeValidacao.push({ rawCliente, erros: errosCampos });
    }

    return {
      clienteOriginal: rawCliente,
      cnpjLimpo,
      razaoSocialStr: razaoSocialStr || undefined, // undefined se vazio após trim
      nomeFantasiaStr,
      isValid: errosCampos.length === 0,
      errosValidacaoCampos: errosCampos,
    };
  });

  // 1.1 Desduplicar CNPJs do próprio arquivo
  const clientesUnicosNoArquivo: typeof clientesProcessadosInicialmente = [];
  const cnpjsJaVistosNoArquivo = new Set<string>();

  for (const clienteProc of clientesProcessadosInicialmente) {
    if (clienteProc.isValid && clienteProc.cnpjLimpo) { // Processar apenas se o CNPJ limpo for válido
      if (cnpjsJaVistosNoArquivo.has(clienteProc.cnpjLimpo)) {
        resultado.cnpjsDuplicadosNoArquivo.push(clienteProc.clienteOriginal);
      } else {
        cnpjsJaVistosNoArquivo.add(clienteProc.cnpjLimpo);
        clientesUnicosNoArquivo.push(clienteProc);
      }
    } else if (!clienteProc.isValid) {
      // Se não for válido, já foi adicionado a resultado.errosDeValidacao no map anterior
      // mas precisamos manter na lista para que não seja perdido se houver outros erros gerais.
      // No entanto, para a lógica de "clientesParaValidarExistencia", só queremos os válidos.
      // Se houver erros de validação de campo, ele já foi adicionado a resultado.errosDeValidacao
      // Não precisa adicionar novamente aqui, apenas garantir que não será processado para inserção.
    } else {
       // Caso CNPJ limpo seja inválido mas isValid seja true (não deveria acontecer com a lógica atual, mas para segurança)
       // Adicionar a erros de validação se não estiver lá
        const jaExisteErroParaEste = resultado.errosDeValidacao.find(e => e.rawCliente === clienteProc.clienteOriginal);
        if (!jaExisteErroParaEste) {
            resultado.errosDeValidacao.push({
                rawCliente: clienteProc.clienteOriginal,
                erros: clienteProc.errosValidacaoCampos.length > 0 ? clienteProc.errosValidacaoCampos : ["CNPJ inválido após limpeza, mas marcado como válido inicialmente."],
            });
        }
    }
  }
   // Adiciona os inválidos que não eram duplicatas de arquivo para manter os erros de validação.
  clientesProcessadosInicialmente.forEach(cp => {
    if (!cp.isValid && !clientesUnicosNoArquivo.some(cu => cu.clienteOriginal === cp.clienteOriginal) && !resultado.cnpjsDuplicadosNoArquivo.some(cd => cd === cp.clienteOriginal)) {
        // Se não é válido, não está na lista de únicos (pq só válidos entram lá se não forem duplicatas)
        // E não está na lista de duplicatas de arquivo (pq só válidos que são duplicatas entram lá)
        // Então, precisa ser adicionado à lista que vai gerar `clientesParaValidarExistencia`
        // para que seus erros de validação originais não sejam perdidos.
        // No entanto, `clientesParaValidarExistencia` já é filtrado por `isValid` abaixo, então este forEach
        // pode não ser estritamente necessário para `errosDeValidacao`, mas assegura que
        // `clientesUnicosNoArquivo` contenha *apenas* os válidos e únicos, enquanto os erros
        // são mantidos no `resultado`.
    }
  });


  const clientesParaValidarExistencia = clientesUnicosNoArquivo.filter(
    (c) => c.isValid // Filtra novamente por isValid, pois agora clientesUnicosNoArquivo só tem os que não são duplicatas de arquivo
  );


  if (clientesParaValidarExistencia.length === 0 && (resultado.errosDeValidacao.length > 0 || resultado.cnpjsDuplicadosNoArquivo.length > 0) ) {
    return resultado;
  }
  if (clientesParaValidarExistencia.length === 0) {
      resultado.errosGerais.push("Nenhuma linha válida encontrada no arquivo após validação de formato.");
      return resultado;
  }


  // 2. Verificar CNPJs existentes em batch
  const cnpjsParaChecar = clientesParaValidarExistencia.map(
    (c) => c.cnpjLimpo
  );

  const setCnpjsExistentes = new Set<string>();
  const chunkSize = 100; // Processar CNPJs em lotes de 100

  for (let i = 0; i < cnpjsParaChecar.length; i += chunkSize) {
    const chunk = cnpjsParaChecar.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const { data: clientesExistentesDbChunk, error: erroClientesExistentesChunk } =
      await supabase
        .from("clientes")
        .select("cnpj")
        .in("cnpj", chunk);

    if (erroClientesExistentesChunk) {
      console.error(
        "Erro ao buscar chunk de clientes existentes:",
        erroClientesExistentesChunk
      );
      resultado.errosGerais.push(
        "Erro ao verificar clientes existentes (lote): " +
          erroClientesExistentesChunk.message
      );
      // Decide se quer parar tudo ou tentar continuar com os lotes que funcionaram
      // Por simplicidade, vamos retornar o erro aqui. Poderia ser mais robusto.
      return resultado;
    }
    clientesExistentesDbChunk?.forEach((c) => setCnpjsExistentes.add(c.cnpj));
  }
  
  const clientesFinaisParaInserir: ClienteInsert[] = [];
  clientesParaValidarExistencia.forEach((clienteProc) => {
    if (setCnpjsExistentes.has(clienteProc.cnpjLimpo)) {
      resultado.cnpjsDuplicados.push(clienteProc.clienteOriginal);
    } else if (clienteProc.razaoSocialStr) { // Confirma que razaoSocialStr existe
      clientesFinaisParaInserir.push({
        cnpj: clienteProc.cnpjLimpo,
        razao_social: clienteProc.razaoSocialStr,
        nome_fantasia: clienteProc.nomeFantasiaStr,
      });
    }
  });

  // 3. Inserir em Batch
  if (clientesFinaisParaInserir.length > 0) {
    const { error: erroInsert } = await supabase
      .from("clientes")
      .insert(clientesFinaisParaInserir);

    if (erroInsert) {
      console.error("Erro ao inserir clientes:", erroInsert);
      resultado.errosGerais.push(
        "Erro ao salvar clientes no banco: " + erroInsert.message
      );
       clientesFinaisParaInserir.forEach((cliente) => {
        const rawClienteOriginal = rawClientes.find(
          (rn) =>
            limparCnpj(rn.cnpj) === cliente.cnpj
        );
        resultado.errosDeValidacao.push({
          rawCliente: rawClienteOriginal || {
            cnpj: cliente.cnpj,
            razao_social: cliente.razao_social,
            nome_fantasia: cliente.nome_fantasia,
          },
          erros: ["Falha ao inserir no banco de dados."],
        });
      });
    } else {
      resultado.importadosComSucesso = clientesFinaisParaInserir.length;
      let msgParts = [
        `${resultado.importadosComSucesso} cliente(s) importado(s) com sucesso.`,
      ];
      if (resultado.cnpjsDuplicados.length > 0) {
        msgParts.push(
          `${resultado.cnpjsDuplicados.length} CNPJ(s) já existente(s) no banco foram ignorado(s).`
        );
      }
      if (resultado.cnpjsDuplicadosNoArquivo.length > 0) {
        msgParts.push(
          `${resultado.cnpjsDuplicadosNoArquivo.length} CNPJ(s) duplicado(s) no arquivo foram ignorado(s).`
        );
      }
      resultado.mensagemSucesso = msgParts.join(" ");
    }
  } else {
     if (resultado.cnpjsDuplicados.length > 0 || resultado.cnpjsDuplicadosNoArquivo.length > 0 && resultado.errosDeValidacao.length === 0 && resultado.errosGerais.length === 0) {
       let msg = "Nenhum cliente novo para importar. ";
       const msgsIgnorados = [];
       if (resultado.cnpjsDuplicados.length > 0) {
         msgsIgnorados.push(`${resultado.cnpjsDuplicados.length} CNPJ(s) já existente(s) no banco foram identificado(s) e ignorado(s).`);
       }
       if (resultado.cnpjsDuplicadosNoArquivo.length > 0) {
         msgsIgnorados.push(`${resultado.cnpjsDuplicadosNoArquivo.length} CNPJ(s) duplicado(s) no arquivo foram identificado(s) e ignorado(s).`);
       }
       resultado.mensagemSucesso = msg + msgsIgnorados.join(" ");

     } else if (rawClientes.length > 0 && resultado.errosDeValidacao.length === 0 && resultado.cnpjsDuplicados.length === 0 && resultado.cnpjsDuplicadosNoArquivo.length === 0 && resultado.errosGerais.length === 0) {
        resultado.errosGerais.push("Nenhum cliente processado ou todos os clientes foram filtrados antes da validação final.");
     }
  }

  if (resultado.importadosComSucesso > 0) {
    revalidatePath("/admin/clientes");
  }

  return resultado;
} 