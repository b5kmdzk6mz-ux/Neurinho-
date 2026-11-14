#!/usr/bin/env bash
# Prepara o estudio numa sessao nova: bibliotecas Python + modelo de transcricao.
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { apt-get update -q && apt-get install -y -q ffmpeg; }
pip install -q faster-whisper numpy
bash baixar_modelo.sh
echo "Estudio pronto."
