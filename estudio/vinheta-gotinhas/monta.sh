#!/usr/bin/env bash
# junta apresentador+Polly e as gotinhas na ordem (gota_1 ... gota_7), com corte seco
set -e
cd "$(dirname "$0")"
ARQS=(saida/Apresentador_e_Polly.mp4 $(ls saida/gota_[1-7]_*.mp4 | sort))
IN=(); FC=""; L=""
for k in "${!ARQS[@]}"; do IN+=(-i "${ARQS[$k]}"); FC+="[$k:v]setsar=1[v$k];[$k:a]aresample=48000[a$k];"; L+="[v$k][a$k]"; done
FC+="${L}concat=n=${#ARQS[@]}:v=1:a=1[v][a]"
printf '%s\n' "${ARQS[@]}"
ffmpeg -hide_banner -loglevel error -y "${IN[@]}" -filter_complex "$FC" -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart saida/Clube_das_Gotinhas_montagem.mp4
ffprobe -v error -show_entries format=duration,size -of compact saida/Clube_das_Gotinhas_montagem.mp4
