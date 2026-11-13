# Neurinho

Neurinho: estudo que cabe no seu dia. App de estudo ativo para estudantes de Enfermagem.

## Jogo: A Jornada das Sinapses

Abra a aba **Jogo** na barra de baixo do app. O Neurinho enfrenta cinco vilões (Procrastino, Distrax, Barão Insônia, Ansiax e Dona Bagunça) e o chefe final Lorde Apagão respondendo questões do banco de estudo. História, regras e vilões estão em [JOGO.md](JOGO.md).

## Anexar arquivo e gerar resumo

Na aba **Cartões > Anexar**, envie um PDF, Word (.docx), foto (JPG/PNG) ou texto. O app lê o arquivo no próprio aparelho (inclusive fotos e PDFs digitalizados) e gera:

- **Resumo grátis:** escolhe as frases principais do texto e cria cartões a partir das definições.
- **Resumo com IA (opcional):** usa a Claude, da Anthropic, com a chave de API da própria pessoa (uso pago, cobrado na conta da Anthropic). Reescreve o conteúdo em tópicos e cria cartões e questões de prova.

Os resumos salvos aparecem na aba Resumos, com a etiqueta "Meu". As bibliotecas usadas estão em `vendor/`.

## Provedor do Autocuidado (saúde do homem)

App separado na pasta [`autocuidado/`](autocuidado/), feito para a ação de educação em saúde do Novembro Azul (Grupo 2: Saúde do Homem). Funciona sem internet e pode ser instalado no celular.

- App: `https://b5kmdzk6mz-ux.github.io/Neurinho-/autocuidado/`
- Cartaz A4 e cartões com QR Code: `autocuidado/cartaz.html`
- Guia de identidade visual e ideias de nome: `autocuidado/identidade.html`
- Fontes Montserrat e Open Sans em `autocuidado/fontes/` (licença OFL)
- Prompts para gerar logo, cartaz e post no ChatGPT: [`autocuidado/PROMPTS.md`](autocuidado/PROMPTS.md)
- Para editar os locais de atendimento, mude a lista `LOCAIS` no começo do script de `autocuidado/index.html`.
