// TinySDF copied from https://github.com/mapbox/tiny-sdf

// BSD-2-Clause
// Copyright (c) 2016-2022 Mapbox, Inc.

// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import nodeCanvas from 'canvas';

const INF = 1e20;

export default class TinySDF {
    constructor({
        fontSize = 24,
        buffer = 3,
        radius = 8,
        cutoff = 0.25,
        fontFamily = 'sans-serif',
        fontWeight = 'normal',
        fontStyle = 'normal'
    } = {}) {
        this.buffer = buffer;
        this.cutoff = cutoff;
        this.radius = radius;

        // make the canvas size big enough to both have the specified buffer around the glyph
        // for "halo", and account for some glyphs possibly being larger than their font size
        // const size = this.size = fontSize + buffer * 4;
        const size = this.size = fontSize + buffer * 4;

        const canvas = this._createCanvas(size);
        const ctx = this.ctx = canvas.getContext('2d', {willReadFrequently: true});
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left'; // Necessary so that RTL text doesn't have different alignment
        ctx.fillStyle = 'black';

        // temporary arrays for the distance transform
        this.gridOuter = new Float64Array(size * size);
        this.gridInner = new Float64Array(size * size);
        this.f = new Float64Array(size);
        this.z = new Float64Array(size + 1);
        this.v = new Uint16Array(size);
    }

    _createCanvas(size) {
        // const canvas = document.createElement('canvas');
        // canvas.width = canvas.height = size;
        // return canvas;
        return nodeCanvas.createCanvas(size, size);
    }

    draw(char) {
        const {
            width: glyphAdvance,
            actualBoundingBoxAscent,
            actualBoundingBoxDescent,
            actualBoundingBoxLeft,
            actualBoundingBoxRight
        } = this.ctx.measureText(char);

        // The integer/pixel part of the top alignment is encoded in metrics.glyphTop
        // The remainder is implicitly encoded in the rasterization
        const glyphTop = Math.ceil(actualBoundingBoxAscent);
        const glyphLeft = 0;

        // If the glyph overflows the canvas size, it will be clipped at the bottom/right
        const glyphWidth = Math.max(0, Math.min(this.size - this.buffer, Math.ceil(actualBoundingBoxRight - actualBoundingBoxLeft)));
        const glyphHeight = Math.min(this.size - this.buffer, glyphTop + Math.ceil(actualBoundingBoxDescent));

        const width = glyphWidth + 2 * this.buffer;
        const height = glyphHeight + 2 * this.buffer;

        const len = Math.max(width * height, 0);
        const data = new Uint8ClampedArray(len);
        const glyph = {data, width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance};
        if (glyphWidth === 0 || glyphHeight === 0) return glyph;

        const {ctx, buffer, gridInner, gridOuter} = this;
        ctx.clearRect(buffer, buffer, glyphWidth, glyphHeight);
        ctx.fillText(char, buffer, buffer + glyphTop);
        const imgData = ctx.getImageData(buffer, buffer, glyphWidth, glyphHeight);

        // Initialize grids outside the glyph range to alpha 0
        gridOuter.fill(INF, 0, len);
        gridInner.fill(0, 0, len);

        for (let y = 0; y < glyphHeight; y++) {
            for (let x = 0; x < glyphWidth; x++) {
                const a = imgData.data[4 * (y * glyphWidth + x) + 3] / 255; // alpha value
                if (a === 0) continue; // empty pixels

                const j = (y + buffer) * width + x + buffer;

                if (a === 1) { // fully drawn pixels
                    gridOuter[j] = 0;
                    gridInner[j] = INF;

                } else { // aliased pixels
                    const d = 0.5 - a;
                    gridOuter[j] = d > 0 ? d * d : 0;
                    gridInner[j] = d < 0 ? d * d : 0;
                }
            }
        }

        edt(gridOuter, 0, 0, width, height, width, this.f, this.v, this.z);
        edt(gridInner, buffer, buffer, glyphWidth, glyphHeight, width, this.f, this.v, this.z);

        for (let i = 0; i < len; i++) {
            const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
            data[i] = Math.round(255 - 255 * (d / this.radius + this.cutoff));
        }

        return glyph;
    }
}

// 2D Euclidean squared distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/papers/dt-final.pdf
function edt(data, x0, y0, width, height, gridSize, f, v, z) {
    for (let x = x0; x < x0 + width; x++) edt1d(data, y0 * gridSize + x, gridSize, height, f, v, z);
    for (let y = y0; y < y0 + height; y++) edt1d(data, y * gridSize + x0, 1, width, f, v, z);
}

// 1D squared distance transform
function edt1d(grid, offset, stride, length, f, v, z) {
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    f[0] = grid[offset];

    for (let q = 1, k = 0, s = 0; q < length; q++) {
        f[q] = grid[offset + q * stride];
        const q2 = q * q;
        do {
            const r = v[k];
            s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
        } while (s <= z[k] && --k > -1);

        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = INF;
    }

    for (let q = 0, k = 0; q < length; q++) {
        while (z[k + 1] < q) k++;
        const r = v[k];
        const qr = q - r;
        grid[offset + q * stride] = f[r] + qr * qr;
    }
}