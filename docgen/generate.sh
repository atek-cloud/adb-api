#! /bin/sh

# NOTE
# this can be used to help generate the readme, but the output has to be manually massaged (sigh)

./node_modules/.bin/typedoc \
  --plugin typedoc-plugin-markdown --theme markdown \
  --readme ./docgen/BASE_README.md \
  --excludeInternal --disableSources --sort source-order \
  --exclude "src/types.ts" \
  --out ./docgen/temp-docs \
  ./src/index.ts
./node_modules/.bin/concat-md --decrease-title-levels ./docgen/temp-docs > README.md
rm -Rf ./docgen/temp-docs