#!/usr/bin/env bash
# Baixa o modelo de transcricao Whisper "small" (CTranslate2 int8, ~250 MB) para estudio/modelos/.
# Fonte: pacotes npm @skillninja/shortmovie-telop-model-p0..p3 (o HuggingFace pode estar bloqueado
# na rede). Nenhum script do pacote e executado: so os arquivos sao extraidos e o checksum e conferido.
set -euo pipefail
DEST="$(cd "$(dirname "$0")" && pwd)/modelos/whisper-small"
ESPERADO=ca732cb1379efc49417d028465f543d83a39de2c61f3027678de103dc404ce73
if [ -f "$DEST/model.bin" ] && echo "$ESPERADO  $DEST/model.bin" | sha256sum -c --quiet 2>/dev/null; then
  echo "Modelo ja instalado em $DEST"; exit 0
fi
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$DEST"
for p in 0 1 2 3; do
  (cd "$TMP" && npm pack --silent "@skillninja/shortmovie-telop-model-p$p@1.0.0" >/dev/null)
  mkdir -p "$TMP/x$p" && tar xzf "$TMP"/skillninja-shortmovie-telop-model-p$p-1.0.0.tgz -C "$TMP/x$p"
done
cp "$TMP"/x0/package/{config.json,preprocessor_config.json,tokenizer.json,vocabulary.json} "$DEST/"
cat "$TMP"/x0/package/model.bin.part0 "$TMP"/x1/package/model.bin.part1 \
    "$TMP"/x2/package/model.bin.part2 "$TMP"/x3/package/model.bin.part3 > "$DEST/model.bin"
echo "$ESPERADO  $DEST/model.bin" | sha256sum -c
echo "Modelo instalado em $DEST"
