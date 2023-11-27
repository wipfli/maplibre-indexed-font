# maplibre-indexed-font
Use an indexed font in MapLibre to render non-supported scripts

## Usage

To get the sdf_font_tool submodule, run:

```
git submodule update --init
```

Assume you have a `segments.txt` file with the text segments that should be used as font characters.

To generate the SDF glyphs with TinySDF, run:

```
cd tinysdf
npm install
npm run main
```

This creates `glyphs.json`.

Then to bundle the glyphs into a MapLibre font glyph range, run:

```
cd sdf_font_tools
./run.sh
```

This uses the glyphs stored in `glyphs.json` and it uses a normal `roboto.ttf` font for the usual characters. The output is stored in the `indexed-font` directory.

The labels are stored in `tests.geojson`. Encode them to use the indexed-font codepoints from the `segments.txt` file with:

```
python3 encode_tests.py
```


