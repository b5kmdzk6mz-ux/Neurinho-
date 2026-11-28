# Instruções para o Claude

- **Sempre responda em português do Brasil**: nas mensagens, nos commits, nos PRs e nos textos do app. Nunca troque para inglês no meio da conversa.
- A dona do projeto usa o iPad. Explique passo a passo, com os nomes dos botões como aparecem na tela.
- Abrir PR e fazer merge só quando ela pedir.

## Projetos
- `index.html` (raiz): Neurinho, app de estudos de Enfermagem.
- `sinapse/`: Sinapse, app de cadernos à mão (PWA). `sinapse/claude-build.py` gera a versão que roda dentro do Claude (artifact). A nuvem é o Supabase (`sinapse/nuvem.sql`, guia em `sinapse/NUVEM.md`).
- `transcritor/`: Transcritor, app que transforma vídeo/áudio em texto (PWA). Arquivos: Whisper no aparelho (`worker.js`). YouTube: Edge Function `legendas-youtube` no Supabase do Sinapse (código em `transcritor/supabase/`).
