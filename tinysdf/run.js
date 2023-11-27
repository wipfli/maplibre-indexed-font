import TinySDF from './tinysdf.js';
import fs from 'fs';

const tinySdf = new TinySDF({
    fontSize: 24,             // Font size in pixels
    fontFamily: 'sans-serif', // CSS font-family
    fontWeight: 'normal',     // CSS font-weight
    fontStyle: 'normal',      // CSS font-style
    buffer: 3,                // Whitespace buffer around a glyph in pixels
    radius: 8,               // How many pixels around the glyph shape to use for encoding distance
    cutoff: 0.25              // How much of the radius (relative) is used for the inside part of the glyph
});

// const glyph = tinySdf.draw('യോ'); // draw a single character

// console.log(glyph);

// console.log(`result.set_bitmap([${glyph.data.join(", ")}].to_vec());`)
// console.log(`result.set_width(${glyph.glyphWidth});`);
// console.log(`result.set_height(${glyph.glyphHeight});`);
// console.log(`result.set_left(${glyph.glyphLeft});`);
// console.log(`result.set_top(${glyph.glyphTop});`);
// console.log(`result.set_advance(${Math.round(glyph.glyphAdvance)});`);

const segments = [];
const filePath = '../segments.txt';
const data = fs.readFileSync(filePath, 'utf-8');
const lines = data.split('\n');
lines.forEach((line) => {
    segments.push(line)
});

const allGlyphs = {};
var i = 57344 // start of private use area in unicode basic multilingual plane
for (const segment of segments) {
    const glyph = tinySdf.draw(segment);
    glyph.data = [...glyph.data];
    glyph.segment = segment;
    allGlyphs[i] = glyph;
    if (++i === 57344 + 200) break;
    // console.log(glyph.height, glyph.glyphHeight)
}

fs.writeFileSync('../glyphs.json', JSON.stringify(allGlyphs));
