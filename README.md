# Neurinho

Neurinho: estudo que cabe no seu dia. App de estudo ativo para estudantes de Enfermagem.

## Jogo: A Jornada das Sinapses

Abra a aba **Jogo** na barra de baixo do app. O Neurinho enfrenta cinco vilões (Procrastino, Distrax, Barão Insônia, Ansiax e Dona Bagunça) e o chefe final Lorde Apagão respondendo questões do banco de estudo. História, regras e vilões estão em [JOGO.md](JOGO.md).

## Anexar arquivo e gerar resumo

Na aba **Cartões > Anexar**, envie um PDF, Word (.docx), foto (JPG/PNG) ou texto. O app lê o arquivo no próprio aparelho (inclusive fotos e PDFs digitalizados) e gera:

- **Resumo grátis:** escolhe as frases principais do texto e cria cartões a partir das definições.
- **Resumo com IA (opcional):** usa a Claude, da Anthropic, com a chave de API da própria pessoa (uso pago, cobrado na conta da Anthropic). Reescreve o conteúdo em tópicos e cria cartões e questões de prova.

- **Resumo pelo Claude, sem chave:** o botão **Copiar pedido** copia um pedido pronto. A pessoa cola no Claude junto com o arquivo e depois cola a resposta em **Colar texto**: o resumo vai para a aba Resumos e os cartões para a biblioteca.

Os resumos salvos aparecem na aba Resumos, com a etiqueta "Meu". As bibliotecas usadas estão em `vendor/`.

## Provedor do Autocuidado (saúde do homem)

App separado na pasta [`autocuidado/`](autocuidado/), feito para a ação de educação em saúde do Novembro Azul (Grupo 2: Saúde do Homem). Funciona sem internet e pode ser instalado no celular.

- App: `https://b5kmdzk6mz-ux.github.io/Neurinho-/autocuidado/`
- Cartaz A4 e cartões com QR Code: `autocuidado/cartaz.html`
- Guia de identidade visual e ideias de nome: `autocuidado/identidade.html`
- Fontes Montserrat e Open Sans em `autocuidado/fontes/` (licença OFL)
- Prompts para gerar logo, cartaz e post no ChatGPT: [`autocuidado/PROMPTS.md`](autocuidado/PROMPTS.md)
- Para editar os locais de atendimento, mude a lista `LOCAIS` no começo do script de `autocuidado/index.html`.

## Assinatura (R$ 9,99 por mês, Pix manual)

- O app dá 7 dias grátis e depois pede a assinatura. A aluna faz o Pix, envia o comprovante pelo WhatsApp e recebe um link ou código de ativação que vale por um mês.
- Os códigos são criados em `gerador.html`, uma página só da dona do app. A chave secreta fica só no aparelho dela; o app confere os códigos com a chave pública (`LIC_PUB` no `index.html`), sem internet e sem servidor.
- O bloqueio só liga quando `LIC_PUB`, `PAY.pix` e `PAY.zap` estão preenchidos no `index.html`. Enquanto estiverem vazios, o app funciona como antes.

## Sinapse: cadernos à mão

App separado, na pasta [`sinapse/`](sinapse/). É um caderno digital no estilo GoodNotes, pensado primeiro para iPad com Apple Pencil. Endereço: https://b5kmdzk6mz-ux.github.io/Neurinho-/sinapse/

- **Cadernos** com capa colorida e papel liso, pautado, quadriculado, pontilhado ou Cornell (branco ou creme).
- **Caneta com pressão**, marca-texto, borracha e laço (selecionar, mover, duplicar, recolorir e apagar).
- **Segure a caneta parada** no fim do traço e ele vira uma linha reta.
- **Só a caneta escreve:** quando o app percebe a caneta, o dedo passa a rolar a página e a palma da mão é ignorada.
- **Pinça com dois dedos** para dar zoom. No computador, use Ctrl + rolagem.
- **PDF:** importa um PDF para anotar por cima e exporta o caderno inteiro em PDF.
- Funciona offline e salva tudo no próprio aparelho (IndexedDB). O leitor de PDF reaproveita o `vendor/pdf.min.mjs` do Neurinho.
