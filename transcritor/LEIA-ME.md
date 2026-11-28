# Transcritor

App que transforma vídeo e áudio em texto. Endereço (depois do merge na `main`):
**https://b5kmdzk6mz-ux.github.io/Neurinho-/transcritor/**

## Instalar no iPad
1. Abra o endereço acima no **Safari**.
2. Toque no botão **Compartilhar** (quadrado com seta para cima).
3. Toque em **Adicionar à Tela de Início** e depois em **Adicionar**.

## Como funciona
- **📁 Arquivo:** o Whisper roda no próprio iPad, de graça. Na primeira vez ele baixa o modelo
  (Rápido: uns 80 MB; Mais preciso: uns 250 MB). Depois funciona até sem internet.
  Deixe a tela aberta enquanto transcreve.
- **▶️ Link do YouTube:** busca as legendas do vídeo por um servidor no Supabase do Sinapse
  (função `legendas-youtube`, código em `supabase/legendas-youtube/index.ts`).
  O YouTube bloqueia servidores, então a função passa por servidores públicos (Invidious e Piped).
  Esses servidores são de voluntários e às vezes saem do ar. Plano B: Gravação de Tela + aba Arquivo.

## Atualizar a função no Supabase
A função já está publicada no projeto do Sinapse. Se o código mudar, peça ao Claude para
publicar de novo (ele usa o conector do Supabase).
