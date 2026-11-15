#!/usr/bin/env bash
# gota.sh entrada.mov nome.png saida.mp4 : converte para 1080x1920, iguala o volume da voz e poe o nome no alto
set -e
V="$1"; N="$2"; O="$3"
L=$(ffmpeg -hide_banner -i "$V" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-16-($L),1))")
ffmpeg -hide_banner -loglevel error -y -i "$V" -loop 1 -i "$N" -filter_complex "[0:v]scale=1080:1920:flags=lanczos,setsar=1,fps=30,format=yuv420p[bg];[1:v]format=rgba,fade=t=in:st=0.15:d=0.3:alpha=1[n];[bg][n]overlay=x=0:y='70-260*pow(1-min(max((t-0.15)/0.45\,0)\,1)\,3)':shortest=1,format=yuv420p[v];[0:a]aresample=48000,highpass=f=80,afftdn=nr=10:nf=-40,volume=${G}dB,alimiter=limit=0.95:level=false[a]" -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 192k -ar 48000 -ac 2 "$O"
