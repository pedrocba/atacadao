"use client";

import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { processarImportacaoClientesAction, RawCliente } from "./import-action"; // Atualizado
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription, // Adicionado CardDescription
} from "@/components/ui/card";
import {
  Loader2,
  FileDown,
  FileUp,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react"; // Adicionado Users Icon

// Atualizado para campos de cliente
const CAMPOS_EXCEL_MODELO_CLIENTE = [
  { key: "cnpj", label: "CNPJ" },
  { key: "razao_social", label: "Razão Social" },
  { key: "nome_fantasia", label: "Nome Fantasia" },
];

interface DisplayError {
  linha: number | string;
  erros: string[];
  clienteOriginal?: RawCliente; // Atualizado para RawCliente
}

export default function ImportarClientesExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [erros, setErros] = useState<DisplayError[]>([]);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setSucesso(null);
      setErros([]);
    } else {
      setFile(null);
    }
  };

  const resetFileInput = () => {
    const inputFile = document.getElementById(
      "excel-file-input-cliente" // ID Único
    ) as HTMLInputElement;
    if (inputFile) {
      inputFile.value = "";
    }
    setFile(null);
  };

  async function handleUpload() {
    setErros([]);
    setSucesso(null);
    if (!file) {
      setErros([{ linha: "Geral", erros: ["Nenhum arquivo selecionado."] }]);
      return;
    }
    setCarregando(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: null, // Garante que células vazias sejam null e não omitidas
        header: CAMPOS_EXCEL_MODELO_CLIENTE.map((c) => c.key), // Usa as chaves para mapear
        range: 1, // Pula a primeira linha (cabeçalho manual)
      }) as any[];

      const rawClientesParaEnviar: RawCliente[] = jsonData
        .filter((row) => {
          // Considera uma linha válida se tiver pelo menos CNPJ ou Razão Social
          return (
            (row.cnpj && String(row.cnpj).trim() !== "") ||
            (row.razao_social && String(row.razao_social).trim() !== "")
          );
        })
        .map((row, index) => ({
          cnpj: row.cnpj,
          razao_social: row.razao_social,
          nome_fantasia: row.nome_fantasia,
          _originalIndex: index + 1, // +1 para compensar cabeçalho pulado e +1 para ser 1-indexed
        }));

      if (rawClientesParaEnviar.length === 0) {
        setErros([
          {
            linha: "Geral",
            erros: [
              "O arquivo Excel está vazio ou não contém dados processáveis nas colunas esperadas (CNPJ, Razao Social, Nome Fantasia).",
            ],
          },
        ]);
        setCarregando(false);
        return;
      }

      const resultadoImportacao = await processarImportacaoClientesAction(
        rawClientesParaEnviar
      );

      const novosErros: DisplayError[] = [];

      if (
        resultadoImportacao.errosGerais &&
        resultadoImportacao.errosGerais.length > 0
      ) {
        novosErros.push({
          linha: "Geral",
          erros: resultadoImportacao.errosGerais,
        });
      }

      resultadoImportacao.errosDeValidacao?.forEach((err) => {
        const linhaOriginal =
          (err.rawCliente as any)._originalIndex !== undefined
            ? (err.rawCliente as any)._originalIndex + 1 // +1 porque _originalIndex é baseado em dados (pós-cabeçalho)
            : "Cliente";
        novosErros.push({
          linha: `${linhaOriginal}`,
          erros: err.erros,
          clienteOriginal: err.rawCliente,
        });
      });

      resultadoImportacao.cnpjsDuplicados?.forEach(
        (clienteDuplicado, index) => {
          // Tentar encontrar o índice original se ele foi passado
          const linhaOriginal =
            (clienteDuplicado as any)._originalIndex !== undefined
              ? (clienteDuplicado as any)._originalIndex + 1
              : `Duplicado ${index + 1}`;
          novosErros.push({
            linha: `${linhaOriginal}`,
            erros: [
              `CNPJ ${limparCnpj(clienteDuplicado.cnpj)} já existe no sistema e foi ignorado.`,
            ],
            clienteOriginal: clienteDuplicado,
          });
        }
      );

      if (novosErros.length > 0) {
        setErros(novosErros);
      }

      if (resultadoImportacao.mensagemSucesso) {
        setSucesso(resultadoImportacao.mensagemSucesso);
        if (resultadoImportacao.importadosComSucesso > 0) {
          resetFileInput();
        }
      }
    } catch (error: any) {
      console.error("Erro no upload de clientes:", error);
      setErros([
        {
          linha: "Geral",
          erros: [
            "Ocorreu um erro inesperado ao processar o arquivo: " +
              error.message,
          ],
        },
      ]);
    } finally {
      setCarregando(false);
    }
  }

  function gerarModeloExcelCliente() {
    const dadosExemplo = [
      {
        cnpj: "00111222000199",
        razao_social: "Empresa Exemplo Alpha Ltda",
        nome_fantasia: "Alpha Exemplo",
      },
      {
        cnpj: "33444555000100",
        razao_social: "Comercio Exemplo Beta S/A",
        nome_fantasia: "", // Exemplo de nome fantasia vazio
      },
    ];

    // Criar uma worksheet apenas com os dados de exemplo (sem cabeçalho aqui)
    const worksheet = XLSX.utils.json_to_sheet(dadosExemplo, {
      header: CAMPOS_EXCEL_MODELO_CLIENTE.map((c) => c.key), // Define a ordem das colunas
      skipHeader: true, // Não inclui automaticamente os cabeçalhos das chaves
    });

    // Adicionar manualmente os cabeçalhos desejados na primeira linha
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [CAMPOS_EXCEL_MODELO_CLIENTE.map((c) => c.label)],
      { origin: "A1" }
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(data, "modelo_importacao_clientes.xlsx");
  }

  function limparFormulario() {
    resetFileInput();
    setErros([]);
    setSucesso(null);
  }

  // Função auxiliar para limpar CNPJ (se não estiver global)
  function limparCnpj(cnpj: any): string {
    return String(cnpj).replace(/\D/g, "");
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Users className="mr-2 h-6 w-6" /> Importar Clientes de Excel
          </CardTitle>
          <CardDescription>
            Faça o upload de um arquivo Excel (.xlsx, .xls) para adicionar novos
            clientes em massa. O sistema irá ignorar CNPJs que já existem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label
              htmlFor="excel-file-input-cliente"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Selecione o arquivo Excel (.xlsx, .xls)
            </label>

            <Input
              id="excel-file-input-cliente" // ID Único
              type="file"
              accept=".xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="sr-only"
              disabled={carregando}
            />

            <label
              htmlFor="excel-file-input-cliente" // Correspondente ao ID do input
              className={[
                "flex flex-col items-center justify-center w-full p-6",
                "border-2 border-dashed rounded-md",
                "transition-colors duration-200 ease-in-out",
                carregando
                  ? "cursor-not-allowed bg-gray-100"
                  : "cursor-pointer bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-slate-400",
              ].join(" ")}
            >
              <FileUp
                className={[
                  "w-10 h-10 mb-2",
                  file ? "text-green-500" : "text-slate-500",
                ].join(" ")}
              />
              <span
                className={[
                  "text-center text-sm font-medium",
                  file ? "text-slate-700" : "text-slate-600",
                ].join(" ")}
              >
                {file ? file.name : "Clique para escolher um arquivo"}
              </span>
              {file && (
                <span className="text-xs text-slate-500 mt-1">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              )}
              {!file && (
                <span className="text-xs text-slate-500 mt-1">
                  Ou arraste e solte aqui (XLSX ou XLS)
                </span>
              )}
            </label>

            {file && !carregando && (
              <Button
                variant="ghost"
                onClick={() => {
                  resetFileInput();
                  setErros([]);
                  setSucesso(null);
                }}
                className="w-full mt-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Remover arquivo selecionado
              </Button>
            )}

            <p className="mt-3 text-xs text-gray-500">
              Certifique-se que as colunas no Excel são: CNPJ, Razão Social,
              Nome Fantasia (opcional).
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || carregando}
            className="w-full"
          >
            {carregando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            {carregando ? "Processando..." : "Enviar e Processar Arquivo"}
          </Button>

          <Button
            variant="outline"
            onClick={gerarModeloExcelCliente} // Atualizado
            className="w-full flex items-center"
            disabled={carregando}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Baixar Modelo Excel (Clientes)
          </Button>
        </CardContent>

        {sucesso && (
          <CardFooter className="flex-col items-start gap-y-2">
            <Alert
              variant="default"
              className="bg-green-50 border-green-300 text-green-700"
            >
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertTitle>Sucesso!</AlertTitle>
              <AlertDescription>{sucesso}</AlertDescription>
            </Alert>
            <Button
              onClick={limparFormulario}
              variant="outline"
              className="w-full mt-2"
            >
              Importar Novo Arquivo
            </Button>
          </CardFooter>
        )}

        {erros.length > 0 && (
          <CardFooter className="flex-col items-start gap-y-2">
            <Alert variant="destructive">
              <XCircle className="h-5 w-5" />
              <AlertTitle>Erros na Importação</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 mt-2 max-h-60 overflow-y-auto">
                  {erros.map((erro, index) => (
                    <li key={index}>
                      <strong>
                        {
                          typeof erro.linha === "number" ||
                          (typeof erro.linha === "string" &&
                            erro.linha.startsWith("Duplicado"))
                            ? erro.linha // Se for número ou string 'Duplicado X', mostra como está
                            : `Linha ${erro.linha} do Excel` // Caso contrário, formata como linha Excel
                        }
                        :
                      </strong>
                      <ul className="list-circle pl-5">
                        {erro.erros.map((detalhe, i) => (
                          <li key={i}>{detalhe}</li>
                        ))}
                      </ul>
                      {erro.clienteOriginal && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Dados do cliente: CNPJ:{" "}
                          {String(erro.clienteOriginal.cnpj)}, Razão Social:{" "}
                          {String(erro.clienteOriginal.razao_social)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
            <Button
              onClick={limparFormulario}
              variant="outline"
              className="w-full mt-2"
            >
              Tentar Novamente
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
