// From http://jsfiddle.net/HZewg/1/
//
// With modifications to make it a Node.js module
// and refactorings to avoid function many calls.

// var BicubicInterpolation = (function () {
//     return function (x, y, values) {
//         var i0, i1, i2, i3;

//         i0 = TERP(x, values[0][0], values[1][0], values[2][0], values[3][0]);
//         i1 = TERP(x, values[0][1], values[1][1], values[2][1], values[3][1]);
//         i2 = TERP(x, values[0][2], values[1][2], values[2][2], values[3][2]);
//         i3 = TERP(x, values[0][3], values[1][3], values[2][3], values[3][3]);
//         return TERP(y, i0, i1, i2, i3);
//     };
//     /* Yay, hoisting! */
//     function TERP(t, a, b, c, d) {
//         return 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * t) * t) * t + b;
//     }
// })();

// compute vector index from matrix one
// function ivect(ix, iy, w) {
//     // byte array, r,g,b,a
//     return ((ix + w * iy) * 4);
// }

module.exports = {

    BicubicInterpolation(x, y, values) {
        /* Yay, hoisting! */
        function TERP(t, a, b, c, d) {
            return 0.5 * (c - a + (2.0 * a - 5.0 * b + 4.0 * c - d + (3.0 * (b - c) + d - a) * t) * t) * t + b;
        }
        var i0, i1, i2, i3;
        i0 = TERP(x, values[0][0], values[1][0], values[2][0], values[3][0]);
        i1 = TERP(x, values[0][1], values[1][1], values[2][1], values[3][1]);
        i2 = TERP(x, values[0][2], values[1][2], values[2][2], values[3][2]);
        i3 = TERP(x, values[0][3], values[1][3], values[2][3], values[3][3]);
        return TERP(y, i0, i1, i2, i3);
    },

    ivect(ix, iy, w) {
        // byte array, r,g,b,a
        return ((ix + w * iy) * 4);
    },

    bilinear(srcImg, destImg, scale) {
        // c.f.: wikipedia english article on bilinear interpolation
        // taking the unit square, the inner loop looks like this
        // note: there's a function call inside the double loop to this one
        // maybe a performance killer, optimize this whole code as you need
        function inner(f00, f10, f01, f11, x, y) {
            var un_x = 1.0 - x; var un_y = 1.0 - y;
            return (f00 * un_x * un_y + f10 * x * un_y + f01 * un_x * y + f11 * x * y);
        }
        var i, j;
        var iyv, iy0, iy1, ixv, ix0, ix1;
        var idxD, idxS00, idxS10, idxS01, idxS11;
        var dx, dy;
        var r, g, b, a;
        for (i = 0; i < destImg.height; ++i) {
            iyv = i / scale;
            iy0 = Math.floor(iyv);
            // Math.ceil can go over bounds
            iy1 = (Math.ceil(iyv) > (srcImg.height - 1) ? (srcImg.height - 1) : Math.ceil(iyv));
            for (j = 0; j < destImg.width; ++j) {
                ixv = j / scale;
                ix0 = Math.floor(ixv);

                // Math.ceil can go over bounds
                ix1 = (Math.ceil(ixv) > (srcImg.width - 1) ? (srcImg.width - 1) : Math.ceil(ixv));
                // idxD = ivect(j, i, destImg.width);
                // Optimized (inlinig)
                idxD = ((j + destImg.width * i) * 4);

                // matrix to vector indices
                // idxS00 = ivect(ix0, iy0, srcImg.width);
                // idxS10 = ivect(ix1, iy0, srcImg.width);
                // idxS01 = ivect(ix0, iy1, srcImg.width);
                // idxS11 = ivect(ix1, iy1, srcImg.width);
                // Optimized (inlinig)
                idxS00 = ((ix0 + srcImg.width * iy0) * 4);
                idxS10 = ((ix1 + srcImg.width * iy0) * 4);
                idxS01 = ((ix0 + srcImg.width * iy1) * 4);
                idxS11 = ((ix1 + srcImg.width * iy1) * 4);

                // overall coordinates to unit square
                dx = ixv - ix0; dy = iyv - iy0;

                // I let the r, g, b, a on purpose for debugging
                r = inner(srcImg.data[idxS00], srcImg.data[idxS10],
                    srcImg.data[idxS01], srcImg.data[idxS11], dx, dy);
                destImg.data[idxD] = r;

                g = inner(srcImg.data[idxS00 + 1], srcImg.data[idxS10 + 1],
                    srcImg.data[idxS01 + 1], srcImg.data[idxS11 + 1], dx, dy);
                destImg.data[idxD + 1] = g;

                b = inner(srcImg.data[idxS00 + 2], srcImg.data[idxS10 + 2],
                    srcImg.data[idxS01 + 2], srcImg.data[idxS11 + 2], dx, dy);
                destImg.data[idxD + 2] = b;

                a = inner(srcImg.data[idxS00 + 3], srcImg.data[idxS10 + 3],
                    srcImg.data[idxS01 + 3], srcImg.data[idxS11 + 3], dx, dy);
                destImg.data[idxD + 3] = a;
            }
        }
    },

    bicubic(srcImg, destImg, scale) {

        var i, j;
        var dx, dy;
        var repeatX, repeatY;
        var offset_row0, offset_row1, offset_row2, offset_row3;
        var offset_col0, offset_col1, offset_col2, offset_col3;
        var red_pixels, green_pixels, blue_pixels, alpha_pixels;
        for (i = 0; i < destImg.height; ++i) {
            iyv = i / scale;
            iy0 = Math.floor(iyv);

            // We have to special-case the pixels along the border and repeat their values if neccessary
            repeatY = 0;
            if (iy0 < 1) repeatY = -1;
            else if (iy0 > srcImg.height - 3) repeatY = iy0 - (srcImg.height - 3);

            for (j = 0; j < destImg.width; ++j) {
                ixv = j / scale;
                ix0 = Math.floor(ixv);

                // We have to special-case the pixels along the border and repeat their values if neccessary
                repeatX = 0;
                if (ix0 < 1) repeatX = -1;
                else if (ix0 > srcImg.width - 3) repeatX = ix0 - (srcImg.width - 3);

                offset_row1 = ((iy0) * srcImg.width + ix0) * 4;
                offset_row0 = repeatY < 0 ? offset_row1 : ((iy0 - 1) * srcImg.width + ix0) * 4;
                offset_row2 = repeatY > 1 ? offset_row1 : ((iy0 + 1) * srcImg.width + ix0) * 4;
                offset_row3 = repeatY > 0 ? offset_row2 : ((iy0 + 2) * srcImg.width + ix0) * 4;

                offset_col1 = 0;
                offset_col0 = repeatX < 0 ? offset_col1 : -4;
                offset_col2 = repeatX > 1 ? offset_col1 : 4;
                offset_col3 = repeatX > 0 ? offset_col2 : 8;

                //Each offset is for the start of a row's red pixels
                red_pixels = [[srcImg.data[offset_row0 + offset_col0], srcImg.data[offset_row1 + offset_col0], srcImg.data[offset_row2 + offset_col0], srcImg.data[offset_row3 + offset_col0]],
                [srcImg.data[offset_row0 + offset_col1], srcImg.data[offset_row1 + offset_col1], srcImg.data[offset_row2 + offset_col1], srcImg.data[offset_row3 + offset_col1]],
                [srcImg.data[offset_row0 + offset_col2], srcImg.data[offset_row1 + offset_col2], srcImg.data[offset_row2 + offset_col2], srcImg.data[offset_row3 + offset_col2]],
                [srcImg.data[offset_row0 + offset_col3], srcImg.data[offset_row1 + offset_col3], srcImg.data[offset_row2 + offset_col3], srcImg.data[offset_row3 + offset_col3]]];
                offset_row0++;
                offset_row1++;
                offset_row2++;
                offset_row3++;
                //Each offset is for the start of a row's green pixels
                green_pixels = [[srcImg.data[offset_row0 + offset_col0], srcImg.data[offset_row1 + offset_col0], srcImg.data[offset_row2 + offset_col0], srcImg.data[offset_row3 + offset_col0]],
                [srcImg.data[offset_row0 + offset_col1], srcImg.data[offset_row1 + offset_col1], srcImg.data[offset_row2 + offset_col1], srcImg.data[offset_row3 + offset_col1]],
                [srcImg.data[offset_row0 + offset_col2], srcImg.data[offset_row1 + offset_col2], srcImg.data[offset_row2 + offset_col2], srcImg.data[offset_row3 + offset_col2]],
                [srcImg.data[offset_row0 + offset_col3], srcImg.data[offset_row1 + offset_col3], srcImg.data[offset_row2 + offset_col3], srcImg.data[offset_row3 + offset_col3]]];
                offset_row0++;
                offset_row1++;
                offset_row2++;
                offset_row3++;
                //Each offset is for the start of a row's blue pixels
                blue_pixels = [[srcImg.data[offset_row0 + offset_col0], srcImg.data[offset_row1 + offset_col0], srcImg.data[offset_row2 + offset_col0], srcImg.data[offset_row3 + offset_col0]],
                [srcImg.data[offset_row0 + offset_col1], srcImg.data[offset_row1 + offset_col1], srcImg.data[offset_row2 + offset_col1], srcImg.data[offset_row3 + offset_col1]],
                [srcImg.data[offset_row0 + offset_col2], srcImg.data[offset_row1 + offset_col2], srcImg.data[offset_row2 + offset_col2], srcImg.data[offset_row3 + offset_col2]],
                [srcImg.data[offset_row0 + offset_col3], srcImg.data[offset_row1 + offset_col3], srcImg.data[offset_row2 + offset_col3], srcImg.data[offset_row3 + offset_col3]]];
                offset_row0++;
                offset_row1++;
                offset_row2++;
                offset_row3++;
                //Each offset is for the start of a row's alpha pixels
                alpha_pixels = [[srcImg.data[offset_row0 + offset_col0], srcImg.data[offset_row1 + offset_col0], srcImg.data[offset_row2 + offset_col0], srcImg.data[offset_row3 + offset_col0]],
                [srcImg.data[offset_row0 + offset_col1], srcImg.data[offset_row1 + offset_col1], srcImg.data[offset_row2 + offset_col1], srcImg.data[offset_row3 + offset_col1]],
                [srcImg.data[offset_row0 + offset_col2], srcImg.data[offset_row1 + offset_col2], srcImg.data[offset_row2 + offset_col2], srcImg.data[offset_row3 + offset_col2]],
                [srcImg.data[offset_row0 + offset_col3], srcImg.data[offset_row1 + offset_col3], srcImg.data[offset_row2 + offset_col3], srcImg.data[offset_row3 + offset_col3]]];

                // overall coordinates to unit square
                dx = ixv - ix0; dy = iyv - iy0;

                // idxD = ivect(j, i, destImg.width);
                // Optimized (inlinig)
                idxD = ((j + destImg.width * i) * 4);

                destImg.data[idxD] = this.BicubicInterpolation(dx, dy, red_pixels);

                destImg.data[idxD + 1] = this.BicubicInterpolation(dx, dy, green_pixels);

                destImg.data[idxD + 2] = this.BicubicInterpolation(dx, dy, blue_pixels);

                destImg.data[idxD + 3] = this.BicubicInterpolation(dx, dy, alpha_pixels);
            }
        }
    }

};