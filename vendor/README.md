# Bibliotecas incluídas no app

Ficam aqui para o app funcionar sem CDN e offline (depois do primeiro uso).
Só carregam quando a pessoa anexa um arquivo na aba Cartões > Anexar.

| Arquivo | Biblioteca | Versão | Licença |
|---|---|---|---|
| `anthropic-sdk.mjs` | @anthropic-ai/sdk (empacotado com esbuild: `Anthropic` e `betaJSONSchemaOutputFormat`) | 1.1.0 | MIT |
| `pdf.min.mjs`, `pdf.worker.min.mjs` | pdfjs-dist | 6.4.299 | Apache-2.0 |
| `mammoth.browser.min.js` | mammoth (leitura de .docx) | 1.13.0 | BSD-2-Clause |
| `tesseract/tesseract.min.js`, `tesseract/worker.min.js` | tesseract.js (leitura de texto em imagens) | 7.0.0 | Apache-2.0 |
| `tesseract/tesseract-core-simd-lstm.wasm.js` | tesseract.js-core | 7.0.0 | Apache-2.0 |
| `tesseract/por.traineddata.gz` | @tesseract.js-data/por (4.0.0_best_int) | 1.0.0 | Apache-2.0 |

Os textos das licenças estão em `licenses/`.
