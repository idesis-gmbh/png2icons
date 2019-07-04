# png2icons

**png2icons generates [Apple ICNS](https://en.wikipedia.org/wiki/Apple_Icon_Image_format) and [Microsoft ICO](https://en.wikipedia.org/wiki/ICO_(file_format)) files from PNG files.**

The module is platform independent, it works on both Apple and Microsoft systems (and probably other Node.js platforms) without any native dependencies. Node.js module dependencies are minimal (in fact only [one](https://www.npmjs.com/package/pako)). It's also possible to create Microsoft ICO files from non-quadratic source PNGs. A command line interface and an API are provided.

The ideal input is a 24 bit PNG with an alpha channel (RGBA) with 1024×1024 pixels but any other dimensions (even non-quadratic) and most other PNG formats do also work. If you only need to create ICO files 256×256 pixels are sufficient.


## Technical notes

### Apple ICNS

The module is one of the few (if not the only one) which creates a complete list of icons from 16x16 up to 512x512@2 resolutions. Many other modules omit the 16x16 and 32x32 resolution. The generated ICNS files have been tested on OS X/macOS versions from 10.10 up to 10.14 on both retina and non-retina displays. It's well possible that the files would also work on much older versions.

### Microsoft ICO

png2icons creates ICO files with the sizes 16, 24, 32, 48, 64, 72, 96, 128 and 256 pixels (width and height). Icons can be stored as Windows bitmaps or PNGs, additionally there is a special variant where a mix of Windows bitmaps and PNGs is used. Storing as Windows bitmaps is best for compatibility reasons but the file size is quite large. PNG in most cases produces much smaller file sizes but the generated ICO file can cause display problems in Windows version older than Windows 10. In general the files show up without problems in Windows Explorer at any size and at any resolution. This is true for Windows versions down to Windows 7 (older not tested), but the file properties dialog of older Windows versions may show a scrambled view of the embedded icon. Windows 10 does not have this problem. If the ICO file should be used as the embedded icon in a Windows executable the command line switches `-icowe` or `-allwe` (see below) can be used. If used, png2icons will write all icons smaller than 64x64 pixels in Windows bitmap format to the output file and the rest in PNG format. This helps to reduce the icon storage size in the executable and seems to work well in all Windows versions. It has been tested in Windows 7 up to Windows 10 at all kinds of screen resolutions (normal and HiDPI) and also at all different magnification levels.




## Command line usage

```
png2icons infile outfile format [-nn | - bl | -bc | -bz | -hm] [-i]
```

Don\'t append a file extension to `outfile`, it will be set automatically.

You have to set `format` to one of the following values:

| Value    | Output                                                                                       |
| -------- | -------------------------------------------------------------------------------------------- |
| `-icns`  | Apple ICNS format, creates `<outfile>.icns`                                                  |
| `-ico`   | Microsoft ICO format, creates `<outfile>.ico` (contained icons as BMP)                       |
| `-icop`  | Microsoft ICO format, creates `<outfile>.ico` (contained icons as PNG)                       |
| `-icowe` | Microsoft ICO format, creates `<outfile>.ico` (for Windows executables, see technical notes) |
| `-all`   | Create both ICNS and ICO format (ICO with BMP)                                               |
| `-allp`  | Create both ICNS and ICO format (ICO with PNG)                                               |
| `-allwe` | Create both ICNS and ICO format (ICO for Windows executables, see technical notes)           |

You can optionally set the interpolation algorithm to one of the following parameters:

| Parameter | Interpolation algorithm                           |
| --------- | ------------------------------------------------- |
| `-nn`     | Nearest Neighbor, fastest, mediocre to OK quality |
| `-bl`     | Bilinear, fast, quality OK                        |
| `-bc`     | Bicubic, slower, good to very good quality        |
| `-bz`     | Bezier, quite slow, high quality                  |
| `-hm`     | Hermite, quite slow, high quality                 |

If no interpolation is set *Bicubic* (`-bc`) is used as the default.

With `-i` info messages are printed to the console during processing.

Example:

```
png2icons sample.png icon -allp -bc -i
```

This will create the files `icon.icns` and `icon.ico` where `icon.ico` contains icons in PNG format. During processing info messages will be printed to the console.


## API usage

The module exports three functions:

```
function createICNS(input, scalingAlgorithm, numOfColors)
function createICO(input, scalingAlgorithm, numOfColors, usePNG, forWinExe)
function setLogger(logFn)
```

`createICNS` creates the Apple ICNS format, `createICO` creates the Microsoft ICO format.

Parameters identical for both `create*` functions:

- `input` is a buffer containing the raw content of a PNG file, obtained, for example, with `fs.readFileSync`.

- `scalingAlgorithm` sets the algorithm to be used when scaling the input images for the various icon sizes. It can be one of the following constants:

    ```javascript
    RESIZE_NEAREST_NEIGHBOR = 0;
    RESIZE_BILINEAR = 1;
    RESIZE_BICUBIC = 2;
    RESIZE_BEZIER = 3;
    RESIZE_HERMITE = 4;
    ```

- `numOfColors` controls the reduction of colors in the compressed output if PNG is used for the icons . A value of `0` retains all colors from `input` (lossless), a value greater than `0` reduces the colors to the given number (per color channel, so `256` is the maximum value). This can lead to much smaller files. Please note:   `numOfColors` is ignored if `usePNG` is set to `false` (`createICO`) but it is always used if `forWinExe` is `true`.

If the boolean parameter `usePNG` for `createICO` is set to `true` this function will use PNG for each icon in the created ICO file, otherwise Windows bitmaps will be used. Please note that PNG in ICO files may lead to problems in Windows versions older than Vista.

If the optional parameter `forWinExe` for `createICO` is set to `true` png2icons will create a mix of PNG and BMP icons in the generated output. The icon sizes 16, 24, 32 and 48 will be in BMP format and all others in PNG format. This helps to reduce the ICO file size. Using BMP for the smaller icon sizes prevents display problems in the file properties dialog of Windows versions older than Windows 10. This parameter should be used, if an ICO file for embedding in Windows executables must be created (for example for Electron apps).

With `setLogger` you can supply your own logging function. The logging function (`logFn`) must accept the same parameters like `console.log`, so you could use that in simple cases, e. g. `setLogger(console.log)`. No logging function is set by default.

The return value is `null` in case of an error, otherwise a buffer which contains the binary data of the generated ICNS/ICO file is returned. You could use, for example, `fs.writeFileSync` to save it as a file.

**Example:**

```javascript
var png2icons = require("png2icons");
var fs = require("fs");

var input = fs.readFileSync("sample.png");

// Apple ICNS with bilinear interpolation and no color reduction.
// Log infos via console.log.
png2icons.setLogger(console.log);
var output = png2icons.createICNS(input, png2icons.BILINEAR, 0);
if (output) {
    fs.writeFileSync("icon.icns", output);
}

// Microsoft ICO using PNG icons with Bezier interpolation and
// reduction to 20 colors.
// Log infos via console.log (logging function already set before).
output = png2icons.createICO(input, png2icons.BEZIER, 20, true);
fs.writeFileSync("icon_png.ico", output);

// Microsoft ICO using BMP icons with bicubic interpolation,
// (numOfColors is ignored). Prevent any logging.
png2icons.setLogger(null);
output = png2icons.createICO(input, png2icons.BILINEAR, 0, false);
fs.writeFileSync("icon_bmp.ico", output);

// Microsoft ICO using PNG and BMP icons with bicubic interpolation,
// (numOfColors applies!). Suitable for embedding the generated
// icon file in Windows executables. Prevent any logging.
png2icons.setLogger(null);
output = png2icons.createICO(input, png2icons.BCUBIC, 0, false, true);
fs.writeFileSync("icon_winexe.ico", output);
```


## Development

After cloning the repository run `npm i` or `npm install` to install the necessary dependencies. A run of `npm run make` creates the JavaScript output files. `npm run lint` checks the TypeScript sources with a linter. `npm test` converts the sample PNG file in `./sample` to both the ICNS and ICO (for Windows executables) format (`./sample/sample.icns` and `./sample/sample.ico` will be generated).

png2icons is developed in TypeScript. If you're using TypeScript make sure that you add `@types/node` to the development dependencies in your `package.json`, otherwise the compiler will complain about missing definitions.


## Credits

This module wouldn't have been possible without code from the following projects:

- Read/write PNG images: [UPNG.js](https://github.com/photopea/UPNG.js)
- Image blitting: [Jimp](https://github.com/oliver-moran/jimp)
- Image resizing: [ImageJS](https://github.com/guyonroche/imagejs)
- PackBits compression: [packbits](https://github.com/fiahfy/packbits)


## License

MIT © [idesis GmbH](https://www.idesis.de), Rellinghauser Straße 334F, D-45136 Essen

See the `LICENSE` file for details.


## Changelog

### 2.0.0

- Added sizes `is32`and `il32` to ICNS.
- Prevent color palette in small PNGs.
- Added special ICO format for Windows executables.
- Fixed wrong offsets/sizes for PNGs in ICO.
- Fixed Windows DIB creation for ICO.
- Use ES2015 (TypeScript).
