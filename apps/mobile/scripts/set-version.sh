#!/bin/zsh
# Sets the version shown in the stores and the build number both stores need
# raised on every upload, on iOS and Android together.
#   scripts/set-version.sh 1.0.0 3
set -euo pipefail
cd "${0:h}/.."
[[ $# -eq 2 && $1 =~ '^[0-9]+\.[0-9]+\.[0-9]+$' && $2 =~ '^[0-9]+$' ]] || { echo "usage: $0 <x.y.z> <build number>"; exit 1; }
sed -i '' -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = $1;/; s/CURRENT_PROJECT_VERSION = [^;]+;/CURRENT_PROJECT_VERSION = $2;/" ios/App/App.xcodeproj/project.pbxproj
sed -i '' -E "s/versionCode [0-9]+/versionCode $2/; s/versionName \"[^\"]*\"/versionName \"$1\"/" android/app/build.gradle
echo "iOS and Android: version $1 ($2)"
