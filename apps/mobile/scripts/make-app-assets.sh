#!/bin/zsh
# Writes the app's icons and launch screens from one square master image.
#   scripts/make-app-assets.sh [master.png]   (default: the website's seal, ../../public/bcss-logo.png)
# Needs ImageMagick (`magick`). Re-run when the final icon art arrives (plan decision 7).
set -euo pipefail
cd "${0:h}/.."
SRC=${1:-../../public/bcss-logo.png}
BG='#F5F6F7'   # the app's background token (styles/main.css --background)
ICON_BG='#FFFFFF'
RES=android/app/src/main/res

# A square of `size`, the master scaled to `pct`% of it, centred on `bg` ("none" keeps transparency).
place() { local size=$1 pct=$2 bg=$3 out=$4
  magick "$SRC" -resize "$((size * pct / 100))x$((size * pct / 100))" -background "$bg" -gravity center -extent "${size}x${size}" "$out"; }

# iOS: one 1024 icon with no alpha channel (App Store Connect rejects transparency).
place 1024 86 "$ICON_BG" ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
magick ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png -alpha off ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
# iOS launch screen: the storyboard shows this image, aspect-fill, so the logo sits in the middle third.
for f in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do
  place 2732 22 "$BG" "ios/App/App/Assets.xcassets/Splash.imageset/$f"
done

# Android launcher icons: legacy square and round (48dp), adaptive foreground (108dp, logo inside the 66dp safe zone).
for d in mdpi:1 hdpi:1.5 xhdpi:2 xxhdpi:3 xxxhdpi:4; do
  dpi=${d%%:*}; scale=${d##*:}
  legacy=$(printf '%.0f' $((48 * scale))); fg=$(printf '%.0f' $((108 * scale)))
  place $legacy 88 "$ICON_BG" $RES/mipmap-$dpi/ic_launcher.png
  magick $RES/mipmap-$dpi/ic_launcher.png \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "circle $((legacy/2)),$((legacy/2)) $((legacy/2)),0" \) -alpha off -compose copy-opacity -composite $RES/mipmap-$dpi/ic_launcher_round.png
  place $fg 60 none $RES/mipmap-$dpi/ic_launcher_foreground.png
done
sed -i '' "s|<color name=\"ic_launcher_background\">.*</color>|<color name=\"ic_launcher_background\">$ICON_BG</color>|" $RES/values/ic_launcher_background.xml

# Android launch screens (before Android 12), every density and orientation.
for f in $RES/drawable*/splash.png; do
  read w h <<< "$(magick identify -format '%w %h' "$f")"
  short=$(( w < h ? w : h ))
  magick "$SRC" -resize "$((short * 30 / 100))x$((short * 30 / 100))" -background "$BG" -gravity center -extent "${w}x${h}" "$f"
done
echo "icons and launch screens written from $SRC"
