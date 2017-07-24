# png2icons

**png2icons generates [Apple ICNS](https://en.wikipedia.org/wiki/Apple_Icon_Image_format) 
and [Microsoft ICO](https://en.wikipedia.org/wiki/ICO_(file_format)) files from PNG 
files.**

The module is platform independent, it works on both Apple and Microsoft systems 
(and probably other Node.js platforms) without any native dependencies. Node.js module 
dependencies are minimal (in fact only [one](https://www.npmjs.com/package/pako)). 
It's also possible to create Microsoft ICO files from non-quadratic source PNGs. 
A command line interface and an API are provided.

The ideal input is a 24 bit PNG with an alpha channel (RGBA) with 1024×1024 pixels 
but any other dimensions (even non-quadratic) and most other PNG formats do also 
work. If you only need to create ICO files 256×256 pixels are sufficient.


## Command line usage

```
png2icons infile outfile format [-nn | - bl | -bc | -bz | -hm] [-i]
```

Don\'t append a file extension to `outfile`, it will be set automatically.

You have to set `format` to one of the following values:

|  Value  |  Output |
|---------|---------|
| `-icns` | Apple ICNS format, creates `<outfile>.icns` |
| `-ico`  | Microsoft ICO format, creates `<outfile>.ico` (contained icons as BMP) |
| `-icop` | Microsoft ICO format, creates `<outfile>.ico` (contained icons as PNG) |
| `-all`  | Create both ICNS and ICO format (ICO with BMP) |
| `-allp` | Create both ICNS and ICO format (ICO with PNG) |

You can optionally set the interpolation algorithm to one of the following parameters:

|  Parameter | Interpolation algorithm |
|------------|-------------------------|
| `-nn`      | Nearest Neighbor, fastest, mediocre quality |
| `-bl`      | Bilinear, fast, quality ok |
| `-bc`      | Bicubic, slower, good to very good quality |
| `-bz`      | Bezier, quite slow, high quality |
| `-hm`      | Hermite, quite slow, high quality |

If no interpolation is set *Bicubic* (`-bc`) is used as the default.

With `-i` info messages are printed to the console during processing.

Example:

```
png2icons sample.png icon -allp -bc -i
```

This will create the files `icon.icns` and `icon.ico` where `icon.ico`
contains icons in PNG format. During processing info messages will be
printed to the console.


## API usage

The module exports three functions:

```
function PNG2ICNS(input, scalingAlgorithm, printInfo, numOfColors)
function PNG2ICO_PNG(input, scalingAlgorithm, printInfo, numOfColors)
function PNG2ICO_BMP(input, scalingAlgorithm, printInfo)
```

`PNG2ICNS` creates the Apple ICNS format, `PNG2ICO_PNG` and `PNG2ICO_BMP` create 
the Microsoft ICO format where `PNG2ICO_PNG` uses PNG for each icon in the file 
and `PNG2ICO_BMP` Windows Bitmaps. Please note that PNG in ICO files may lead to 
problems in Windows versions older than Vista.

Parameters identical for all three functions:

- `input` is a buffer containing the raw content of a PNG file, obtained, for 
  example, with `fs.readFileSync`.

- `scalingAlgorithm` sets the algorithm to be used when scaling the input 
  images for the various icon sizes. It can be one of the following constants:

    ```javascript
    RESIZE_NEAREST_NEIGHBOR = 0;
    RESIZE_BILINEAR = 1;
    RESIZE_BICUBIC = 2;
    RESIZE_BEZIER = 3;
    RESIZE_HERMITE = 4;
    ```

- The boolean parameter `printInfo` enables/disables logging of info strings to 
  the console during processing. Please note that you cannot turn off some of 
  the warnings or error messages.

When using PNG for the icons `numOfColors` controls the reduction of colors in 
the compressed output. A value of `0` retains all colors from `input` (lossless),
a value greater than 0 reduces the colors to the given number. This can lead to
much smaller files.

The return value is `null` in case of an error, otherwise a buffer which contains 
the binary data of the generated ICNS/ICO file is returned. You could use, for 
example, `fs.writeFileSync` to save it as a file. 

Example:

```javascript
var png2icons = require("png2icons");
var fs = require("fs");

var input = fs.readFileSync("sample.png");

// Apple ICNS with bilinear interpolation and no color reduction.
// Print info messages
var output = png2icons.PNG2ICNS(input, png2icons.BILINEAR, true, 0);
if (output) {
    fs.writeFileSync("icon.icns", output);
}

// Microsoft ICO using PNG icons with Bezier interpolation and 
// reduction to 20 colors. Print info messages.
output = png2icons.PNG2ICO_PNG(input, png2icons.BEZIER, true, 20);
fs.writeFileSync("icon.ico", output);

// Microsoft ICO using BMP icons with bicubic interpolation.
// Don't print info messages
output = png2icons.PNG2ICO_BMP(input, png2icons.BICUBIC, false);
fs.writeFileSync("icon_bmp.ico", output);
```


## Development

After cloning the repository run `npm i` or `npm install` to install the necessary 
dependencies. A run of `npm run make` creates the JavaScript output files. 
`npm run lint` checks the TypeScript sources with a linter. `npm test` converts 
the sample PNG file in `./sample` to both the ICNS and ICO format 
(`./sample/sample.icns` and `./sample/sample.ico` will be generated).

png2icons is developed in TypeScript. If you're using TypeScript make sure that 
you add `@types/node` to the development dependencies in your `package.json`, 
otherwise the compiler will complain about missing definitions. 


## Credits

This module wouldn't have been possible without code from the following projects:

- Read/write PNG images: [UPNG.js](https://github.com/photopea/UPNG.js)
- Image blitting: [Jimp](https://github.com/oliver-moran/jimp)
- Image resizing: [ImageJS](https://github.com/guyonroche/imagejs)

## License

MIT © [idesis GmbH](http://www.idesis.de), Rellinghauser Straße 334F, D-45136 Essen
