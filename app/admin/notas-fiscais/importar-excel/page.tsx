"use client";

import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  processarImportacaoNotasAction,
  RawNota,
  ImportacaoResultado,
} from "./import-action";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, FileDown, FileUp, CheckCircle2, XCircle } from "lucide-react";

const CAMPOS_EXCEL_MODELO = [
  { key: "cnpj", label: "CNPJ" },
  { key: "num_nota", label: "Número da Nota" },
  { key: "valor", label: "Valor da Nota" },
  { key: "data_emissao", label: "Data de Emissão" },
  { key: "qtd_fornecedores", label: "Qtd. de Fornecedores" },
  { key: "cod_filial", label: "Código da Filial" },
];

interface ExcelRowData {
  cnpj?: unknown;
  num_nota?: unknown;
  valor?: unknown;
  data_emissao?: unknown;
  qtd_fornecedores?: unknown;
  cod_filial?: unknown;
  [key: string]: unknown;
}

interface DisplayError {
  linha: number | string;
  erros: string[];
  notaOriginal?: RawNota;
}

export default function ImportarExcelPage() {
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
      "excel-file-input"
    ) as HTMLInputElement;
    if (inputFile) {
      inputFile.value = "";
    }
    setFile(null);
  };

  async function handleUpload() {
    console.log("DEBUG: handleUpload foi chamado");
    setErros([]);
    setSucesso(null);
    if (!file) {
      setErros([{ linha: "Geral", erros: ["Nenhum arquivo selecionado."] }]);
      return;
    }
    setCarregando(true);

    const CHUNK_SIZE = 200;

    let totalImportadasComSucesso = 0;
    const todosCnpjsInvalidos: ImportacaoResultado["cnpjsInvalidos"] = [];
    const todasNotasDuplicadas: ImportacaoResultado["notasDuplicadas"] = [];
    const todosErrosDeValidacao: ImportacaoResultado["errosDeValidacao"] = [];
    const todosErrosGerais: ImportacaoResultado["errosGerais"] = [];

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
      }) as ExcelRowData[];

      const rawNotasParaEnviar: RawNota[] = jsonData
        .filter((row) => {
          return Object.values(row).some(
            (value) => value !== null && value !== ""
          );
        })
        .map((row: ExcelRowData, index) => ({
          cnpj: row.cnpj,
          num_nota: row.num_nota,
          valor: row.valor,
          data_emissao: row.data_emissao,
          qtd_fornecedores: row.qtd_fornecedores,
          cod_filial: row.cod_filial,
          _originalIndex: index,
        }));

      console.log("DEBUG: rawNotasParaEnviar:", rawNotasParaEnviar);

      if (rawNotasParaEnviar.length === 0) {
        setErros([
          {
            linha: "Geral",
            erros: [
              "O arquivo Excel está vazio ou não contém dados processáveis.",
            ],
          },
        ]);
        setCarregando(false);
        return;
      }

      const numeroDeChunks = Math.ceil(rawNotasParaEnviar.length / CHUNK_SIZE);
      console.log(
        `Total de notas a processar: ${rawNotasParaEnviar.length}, dividido em ${numeroDeChunks} chunk(s) de até ${CHUNK_SIZE} notas.`
      );

      for (let i = 0; i < numeroDeChunks; i++) {
        const chunk = rawNotasParaEnviar.slice(
          i * CHUNK_SIZE,
          (i + 1) * CHUNK_SIZE
        );
        console.log(
          `Processando chunk ${i + 1} de ${numeroDeChunks} com ${chunk.length} notas...`
        );

        try {
          const resultadoChunk = await processarImportacaoNotasAction(chunk);
          console.log(`Resultado do chunk ${i + 1}:`, resultadoChunk);

          totalImportadasComSucesso += resultadoChunk.importadasComSucesso;
          if (resultadoChunk.cnpjsInvalidos) {
            todosCnpjsInvalidos.push(
              ...resultadoChunk.cnpjsInvalidos.map(
                (err: { rawNota: RawNota; erro: string }) => ({
                  ...err,
                  rawNota: {
                    ...err.rawNota,
                    _originalIndex:
                      (err.rawNota as any)._originalIndex !== undefined
                        ? (err.rawNota as any)._originalIndex
                        : "Chunk " + (i + 1),
                  },
                })
              )
            );
          }
          if (resultadoChunk.notasDuplicadas) {
            todasNotasDuplicadas.push(
              ...resultadoChunk.notasDuplicadas.map((nota: RawNota) => ({
                ...nota,
                _originalIndex:
                  (nota as any)._originalIndex !== undefined
                    ? (nota as any)._originalIndex
                    : "Chunk " + (i + 1),
              }))
            );
          }
          if (resultadoChunk.errosDeValidacao) {
            todosErrosDeValidacao.push(
              ...resultadoChunk.errosDeValidacao.map(
                (err: { rawNota: RawNota; erros: string[] }) => ({
                  ...err,
                  rawNota: {
                    ...err.rawNota,
                    _originalIndex:
                      (err.rawNota as any)._originalIndex !== undefined
                        ? (err.rawNota as any)._originalIndex
                        : "Chunk " + (i + 1),
                  },
                })
              )
            );
          }
          if (resultadoChunk.errosGerais) {
            todosErrosGerais.push(
              ...resultadoChunk.errosGerais.map(
                (msg) => `[Lote ${i + 1}] ${msg}`
              )
            );
          }
        } catch (errorInChunk: unknown) {
          console.error(`Erro ao processar o chunk ${i + 1}:`, errorInChunk);
          const errorMessage =
            errorInChunk instanceof Error
              ? errorInChunk.message
              : "Erro desconhecido no lote";
          todosErrosGerais.push(
            `Erro crítico ao processar o lote ${i + 1}: ${errorMessage}. A importação dos lotes seguintes foi interrompida.`
          );
          break;
        }
      }

      const novosErrosAcumulados: DisplayError[] = [];

      if (todosErrosGerais.length > 0) {
        novosErrosAcumulados.push({
          linha: "Geral (Todos os Lotes)",
          erros: todosErrosGerais,
        });
      }

      todosErrosDeValidacao.forEach((err) => {
        const linhaOriginal =
          (err.rawNota as any)._originalIndex !== undefined
            ? (err.rawNota as any)._originalIndex + 2
            : "Nota (Lote específico)";
        novosErrosAcumulados.push({
          linha: `${linhaOriginal}`,
          erros: err.erros,
          notaOriginal: err.rawNota,
        });
      });

      todosCnpjsInvalidos.forEach((err) => {
        const linhaOriginal =
          (err.rawNota as any)._originalIndex !== undefined
            ? (err.rawNota as any)._originalIndex + 2
            : "Nota (Lote específico)";
        novosErrosAcumulados.push({
          linha: `${linhaOriginal}`,
          erros: [err.erro],
          notaOriginal: err.rawNota,
        });
      });

      if (novosErrosAcumulados.length > 0) {
        setErros(novosErrosAcumulados);
      }

      let mensagemSucessoFinal = "";
      if (totalImportadasComSucesso > 0) {
        mensagemSucessoFinal += `${totalImportadasComSucesso} nota(s) fiscal(is) importada(s) com sucesso no total.`;
      }
      if (todasNotasDuplicadas.length > 0) {
        mensagemSucessoFinal += ` ${todasNotasDuplicadas.length} nota(s) já existente(s) foram ignorada(s) no total.`;
      }

      if (mensagemSucessoFinal) {
        setSucesso(mensagemSucessoFinal.trim());
        if (
          totalImportadasComSucesso > 0 &&
          novosErrosAcumulados.length === 0 &&
          todosErrosGerais.length === 0
        ) {
          resetFileInput();
        }
      } else if (
        novosErrosAcumulados.length === 0 &&
        todosErrosGerais.length === 0 &&
        rawNotasParaEnviar.length > 0
      ) {
        if (
          todasNotasDuplicadas.length > 0 &&
          rawNotasParaEnviar.length === todasNotasDuplicadas.length
        ) {
          setSucesso(
            `Nenhuma nota nova para importar. ${todasNotasDuplicadas.length} nota(s) já existente(s) foram identificada(s) e ignorada(s).`
          );
        } else {
          setErros([
            {
              linha: "Geral",
              erros: [
                "Nenhuma nota fiscal foi importada e nenhuma duplicata identificada. Verifique os dados do arquivo.",
              ],
            },
          ]);
        }
      }
    } catch (error: unknown) {
      console.error("Erro no upload (geral):", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      setErros([
        {
          linha: "Geral",
          erros: [
            "Ocorreu um erro inesperado ao processar o arquivo: " +
              errorMessage,
          ],
        },
      ]);
    } finally {
      setCarregando(false);
    }
  }

  function gerarModeloExcel() {
    const dadosExemplo = [
      {
        cnpj: "00111222000199",
        num_nota: "12345",
        valor: "150.75",
        data_emissao: "01/01/2024",
        qtd_fornecedores: "1",
        cod_filial: "1",
      },
      {
        cnpj: "33444555000100",
        num_nota: "67890",
        valor: "2300.50",
        data_emissao: "15/01/2024",
        qtd_fornecedores: "3",
        cod_filial: "2",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(dadosExemplo, {
      header: CAMPOS_EXCEL_MODELO.map((c) => c.key),
    });

    const newHeaders = CAMPOS_EXCEL_MODELO.map((c) => c.label);
    XLSX.utils.sheet_add_aoa(worksheet, [newHeaders], { origin: "A1" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NotasFiscais");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-S",
    });
    saveAs(data, "modelo_importacao_notas.xlsx");
  }

  function limparFormulario() {
    resetFileInput();
    setErros([]);
    setSucesso(null);
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <FileUp className="mr-2 h-6 w-6" /> Importar Notas Fiscais de Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o arquivo Excel (.xlsx, .xls)
            </p>

            <Input
              id="excel-file-input"
              type="file"
              accept=".xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="sr-only"
              disabled={carregando}
            />

            <label
              htmlFor="excel-file-input"
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
              Certifique-se que as colunas no Excel são: CNPJ, Número da Nota,
              Valor da Nota, Data de Emissão (dd/MM/yyyy), Qtd. de Fornecedores
              e Código da Filial.
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
            onClick={gerarModeloExcel}
            className="w-full flex items-center"
            disabled={carregando}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Baixar Modelo Excel
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
                        {typeof erro.linha === "number"
                          ? `Linha ${erro.linha} do Excel`
                          : erro.linha}
                        :
                      </strong>
                      <ul className="list-circle pl-5">
                        {erro.erros.map((detalhe, i) => (
                          <li key={i}>{detalhe}</li>
                        ))}
                      </ul>
                      {erro.notaOriginal && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Dados da nota: CNPJ: {String(erro.notaOriginal.cnpj)},
                          Nº Nota: {String(erro.notaOriginal.num_nota)}, Valor:{" "}
                          {String(erro.notaOriginal.valor)}
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
