#!/usr/bin/env bash
# Fails if Persian/Arabic-script text appears anywhere except the two locale files.
# User-facing text belongs in frontend/src/locales/fa.json or backend/app/i18n/fa.json;
# characters that are data (folding tables, test fixtures) are written as \uXXXX escapes.
set -euo pipefail
cd "$(dirname "$0")/.."

allowed='^(frontend/src/locales/fa\.json|backend/app/i18n/fa\.json)$'
binary='\.(png|jpe?g|ico|webp|woff2?|ttf|otf|xlsx|db)$'
status=0

while IFS= read -r -d '' file; do
  [[ "$file" =~ $allowed || "$file" =~ $binary || ! -f "$file" ]] && continue
  perl -CSD -ne '
    if (/[\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}\x{200C}]/) {
      print "$ARGV:$.: $_"; $found = 1;
    }
    END { exit($found ? 1 : 0) }
  ' "$file" || status=1
done < <(git ls-files -z --cached --others --exclude-standard)

if [ "$status" -ne 0 ]; then
  echo "Persian text found outside the locale files (see above)." >&2
fi
exit "$status"
