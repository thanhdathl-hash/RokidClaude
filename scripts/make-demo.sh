#!/bin/bash
# Rokid Claude · 演示视频 → 优化 GIF。
# 输入:Rokid 手机 app 录的视频(HUD 叠层 + 摄像头 POV 合成的 mp4 等)。
# 输出:用两遍调色板(palettegen/paletteuse)生成的高质量、体积友好的 GIF,适合嵌 README。
#
# 用法:
#   scripts/make-demo.sh 输入视频 [输出.gif] [宽度] [fps] [起始秒] [时长秒]
# 例:
#   scripts/make-demo.sh demo.mp4                      # 全片 → demo.gif(默认 480 宽 / 12fps)
#   scripts/make-demo.sh demo.mp4 out.gif 600 15       # 600 宽、15fps
#   scripts/make-demo.sh demo.mp4 out.gif 480 12 3 8   # 从第 3 秒起、截 8 秒
set -euo pipefail

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "✗ 没装 ffmpeg。先 brew install ffmpeg。"; exit 1
fi

IN="${1:-}"
if [ -z "$IN" ] || [ ! -f "$IN" ]; then
  echo "用法: scripts/make-demo.sh 输入视频 [输出.gif] [宽度=480] [fps=12] [起始秒] [时长秒]"; exit 1
fi
OUT="${2:-${IN%.*}.gif}"
WIDTH="${3:-480}"
FPS="${4:-12}"
START="${5:-}"
DUR="${6:-}"

# 裁剪参数(可选)
CLIP=()
[ -n "$START" ] && CLIP+=(-ss "$START")
[ -n "$DUR" ] && CLIP+=(-t "$DUR")

PAL="$(mktemp -t rokid-pal-XXXX).png"
trap 'rm -f "$PAL"' EXIT

FILTERS="fps=${FPS},scale=${WIDTH}:-1:flags=lanczos"

echo "▶ 第 1 遍:生成调色板…"
ffmpeg -hide_banner -loglevel error -y ${CLIP[@]+"${CLIP[@]}"} -i "$IN" \
  -vf "${FILTERS},palettegen=stats_mode=diff" "$PAL"

echo "▶ 第 2 遍:套调色板生成 GIF…"
ffmpeg -hide_banner -loglevel error -y ${CLIP[@]+"${CLIP[@]}"} -i "$IN" -i "$PAL" \
  -lavfi "${FILTERS}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
  "$OUT"

SIZE=$(du -h "$OUT" | awk '{print $1}')
echo "✓ 生成:$OUT($SIZE,${WIDTH}px/${FPS}fps)"
case "$SIZE" in
  *G) echo "  ⚠️ 体积过大,GitHub 嵌入会很慢——调小 宽度/fps/时长 重生成。" ;;
  *M) awk "BEGIN{exit !(${SIZE%M}>10)}" && echo "  ⚠️ >10MB,GitHub 嵌入偏大——可调小 宽度/fps/时长 重生成。" ;;
esac
echo "  嵌 README:![demo]($OUT)"
