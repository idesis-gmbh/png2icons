import { Image } from "./lib/Image";
import * as Resize from "./lib/resize2";
import * as UPNG from "./lib/UPNG";

/**
 * Support of Apple ICNS format is based on https://en.wikipedia.org/wiki/Apple_Icon_Image_format
 *
 * Support of Microsoft ICO format is based on http://fileformats.wikia.com/wiki/Icon
 * and https://en.wikipedia.org/wiki/ICO_(file_format).
 *
 * Uses additional code taken and modified from the resources below.
 *
 * Read/write PNG images:
 * https://github.com/photopea/UPNG.js
 * https://github.com/photopea/UPNG.js/blob/e984235ee69b97e99380153c9fc32ec5a44e5614/UPNG.js
 * Copyright (c) 2017 Photopea, Ivan Kutskir, https://www.photopea.com
 * The MIT License (MIT)
 *
 * Resize images (original code):
 * https://github.com/guyonroche/imagejs
 * https://github.com/guyonroche/imagejs/blob/33e6806afd3fc69fe39c1a610b7ffeac063b3f3e/lib/resize.js
 * Copyright (c) 2015 guyonroche, Guyon Roche
 * The MIT License (MIT)
 *
 * Resize images and image blitting (blit, getPixelIndex, scan):
 * https://github.com/oliver-moran/jimp
 * https://github.com/oliver-moran/jimp/blob/7fd08253b02f0865029ba00f17dbe7a9f38f4d83/resize2.js
 * https://github.com/oliver-moran/jimp/blob/05db5dfb9101585530ec508123ea4feab23df897/index.js
 * Copyright (c) 2014 Oliver Moran
 * The MIT License (MIT)
 */

////////////////////////////////////////
// Logging
////////////////////////////////////////

/**
 * Logger function type (compatible with console.log).
 */
export type Logger = (message: any, ...optionalParams: any[]) => void;
/**
 * External log function.
 */
let logFnc: Logger | undefined;

/**
 * Set an external logger for log messages from png2icons and UPNG.
 * Note: If no logger is set, *nothing* will ever be logged, not even errors.
 * @param logger Called with info/error messages during processing.
 */
export function setLogger(logger: Logger): void {
    logFnc = logger;
}

/**
 * Internal log function. Only calls the external logger if it exists.
 * @param message Primary log message.
 * @param optionalParams Any number of additional log messages.
 */
function LogMessage(message: any, ...optionalParams: any[]): void {
    if (logFnc) {
        logFnc("png2icons", message, ...optionalParams);
    }
}

////////////////////////////////////////
// Common code
////////////////////////////////////////

/**
 * Maximum number of colors for color reduction.
 */
const MAX_COLORS: number = 256;

/**
 * `Nearest neighbor` resizing interploation algorithm.
 * @see resize.js
 */
export const NEAREST_NEIGHBOR = 0;
/**
 * `Bilinear` resizing interploation algorithm.
 * @see resize.js
 */
export const BILINEAR = 1;
/**
 * `Bicubic` resizing interploation algorithm.
 * @see resize.js
 */
export const BICUBIC = 2;
/**
 * `Bezier` resizing interploation algorithm.
 * @see resize.js
 */
export const BEZIER = 3;
/**
 * `Hermite` resizing interploation algorithm.
 * @see resize.js
 */
export const HERMITE = 4;

/**
 * Simple rectangle.
 */
interface IRect {
    // tslint:disable-next-line: completed-docs
    Left: number;
    // tslint:disable-next-line: completed-docs
    Top: number;
    // tslint:disable-next-line: completed-docs
    Width: number;
    // tslint:disable-next-line: completed-docs
    Height: number;
}

/**
 * Create and return a rectangle.
 * @param left Left position (upper left corner)
 * @param top Top position (upper left corner).
 * @param width Width of rectangle.
 * @param height Height of rectangle.
 * @returns A new rectangle created from the input parameters.
 */
function getRect(left: number, top: number, width: number, height: number): IRect {
    return { Left: left, Top: top, Width: width, Height: height };
}

/**
 * Fit one rectangle into another one.
 * @param src Source rectangle.
 * @param dst Destination rectangle.
 * @returns A new rectangle where "src" has been upsized/downsized proportionally to fit exactly in to "dst".
 */
function stretchRect(src: IRect, dst: IRect): IRect {
    let f: number;
    let tmp: number;
    const result: IRect = getRect(0, 0, 0, 0);
    if ((src.Width / src.Height) >= (dst.Width / dst.Height)) {
        f = (dst.Width / src.Width);
        result.Left = 0;
        result.Width = dst.Width;
        tmp = Math.floor(src.Height * f);
        result.Top = Math.floor((dst.Height - tmp) / 2);
        result.Height = tmp;
    } else {
        f = (dst.Height / src.Height);
        result.Top = 0;
        result.Height = dst.Height;
        tmp = Math.floor(src.Width * f);
        result.Left = Math.floor((dst.Width - tmp) / 2);
        result.Width = tmp;
    }
    return result;
}

/**
 * Scale a source image to fit into a new given size.
 * @see resize.js
 * @param srcImage Source image.
 * @param destRect Destination rectangle to fit the rescaled image into.
 * @param scalingAlgorithm Scaling method (one of the constants NEAREST_NEIGHBOR, BILINEAR, ...).
 * @returns Uint8Array The rescaled image.
 */
function scaleToFit(srcImage: Image, destRect: IRect, scalingAlgorithm: number): Uint8Array {
    const scaleResult: Image = {
        data: new Uint8Array(destRect.Width * destRect.Height * 4),
        height: destRect.Height,
        width: destRect.Width,
    };
    if (scalingAlgorithm === NEAREST_NEIGHBOR) {
        Resize.nearestNeighbor(srcImage, scaleResult, null);
    } else if (scalingAlgorithm === BILINEAR) {
        Resize.bilinearInterpolation(srcImage, scaleResult, null);
    } else if (scalingAlgorithm === BICUBIC) {
        Resize.bicubicInterpolation(srcImage, scaleResult, null);
    } else if (scalingAlgorithm === BEZIER) {
        Resize.bezierInterpolation(srcImage, scaleResult, null);
    } else if (scalingAlgorithm === HERMITE) {
        Resize.hermiteInterpolation(srcImage, scaleResult, null);
    } else {
        Resize.bicubicInterpolation(srcImage, scaleResult, null);
    }
    return scaleResult.data;
}

/**
 * Create an image form a PNG.
 * @param input A buffer containing the raw PNG data/file.
 * @returns Image An image containing the raw bitmap and the image dimensions.
 * @see Declaration image.d.ts.
 */
function decodePNG(input: Buffer): Image | null {
    try {
        // Decoded PNG image
        const PNG: UPNG.UPNGImage = UPNG.decode(input);
        return {
            data: new Uint8Array(UPNG.toRGBA8(PNG)[0]),
            height: PNG.height,
            width: PNG.width,
        };
    } catch (e) {
        LogMessage("Couldn't decode PNG:", e);
        return null;
    }
}

////////////////////////////////////////
// Apple ICNS
////////////////////////////////////////

/**
 * Data for one icon chunk.
 */
interface IICNSChunkParams {
    Type: string;
    Size: number;
    Info: string;
}

/**
 * Create and append an ICNS icon chunk to the final result buffer.
 * @see resize.js, UPNG.js
 * @param chunkParams Object which configures the icon chunk generation.
 * @param srcImage The source image.
 * @param scalingAlgorithm Scaling method (one of the constants NEAREST_NEIGHBOR, BILINEAR, ...).
 * @param outBuffer The buffer where the generated chunk *shall be* appended to.
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless, other values (> 0) means lossy).
 * @returns The buffer where the generated chunk *has been* appended to (outbuffer+icon chunk)
 *      or null if an error occured.
 */
function appendIcnsChunk(chunkParams: IICNSChunkParams, srcImage: Image, scalingAlgorithm: number,
                         outBuffer: Buffer, numOfColors: number): Buffer | null {
    try {
        // Fit source rect to target rect
        const icnsChunkRect: IRect = stretchRect(
            getRect(0, 0, srcImage.width, srcImage.height),
            getRect(0, 0, chunkParams.Size,
            chunkParams.Size),
        );
        // Scale image
        const scaledRawData: Uint8Array = scaleToFit(srcImage, icnsChunkRect, scalingAlgorithm);
        const encodedPNG: ArrayBuffer = UPNG.encode(
            [scaledRawData.buffer],
            icnsChunkRect.Width,
            icnsChunkRect.Height,
            numOfColors,
                [],
                true,
        );
        // Icon header, eg 'ic10' + (length of icon + icon header length)
        const iconHeader: Buffer = Buffer.alloc(8, 0);
        iconHeader.write(chunkParams.Type, 0);
        iconHeader.writeUInt32BE(encodedPNG.byteLength + 8, 4);
        return Buffer.concat(
            [outBuffer, iconHeader, Buffer.from(encodedPNG)],
            outBuffer.length + iconHeader.length + encodedPNG.byteLength,
        );
    } catch (e) {
        LogMessage("Could't append ICNS chunk", e);
        return null;
    }
}

/**
 * Create the Apple ICNS format.
 * @see resize.js, UPNG.js
 * @param input A raw buffer containing the complete source PNG file.
 * @param scalingAlgorithm One of the supported scaling algorithms for resizing.
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless, other values (<= 256) means lossy).
 * @returns A buffer which contains the binary data of the ICNS file or null in case of an error.
 */
export function createICNS(input: Buffer, scalingAlgorithm: number, numOfColors: number): Buffer | null {
    // Source for all resizing actions
    const srcImage: Image | null = decodePNG(input);
    if (!srcImage) {
        return null;
    }
    // All available chunk types
    const icnsChunks: IICNSChunkParams[] = [
        { Type: "ic10", Size: 1024, Info: "512x512@2" },
        { Type: "ic09", Size: 512,  Info: "512x512  " },
        { Type: "ic14", Size: 512,  Info: "256x256@2" },
        { Type: "ic08", Size: 256,  Info: "256x256  " },
        { Type: "ic13", Size: 256,  Info: "128x128@2" },
        { Type: "ic07", Size: 128,  Info: "128x128  " },
        { Type: "ic12", Size: 64,   Info: "32x32@2  " },
        // PNG isn't supported for types il32 and is32. If used the Finder will display a scrambled
        // image in list view. However, the Preview app displays them correctly. The alternative
        // types icp5 and icp4 (with PNG support) also don't work in Finder but again in Preview.
        // { Type: "il32", Size: 32,   Info: "32x32    " },
        // { Type: "is32", Size: 16,   Info: "16       " },
        // { Type: "icp5", Size: 32,   Info: "32x32    " },
        // { Type: "icp4", Size: 16,   Info: "16       " },
        { Type: "ic11", Size: 32,   Info: "16x16@2  " },
    ];
    // ICNS header, "icns" + length of file (written later)
    let outBuffer: Buffer | null = Buffer.alloc(8, 0);
    outBuffer.write("icns", 0);
    // Append all icon chunks
    const nOfColors: number = (numOfColors < 0) ? 0 : ((numOfColors > MAX_COLORS) ? MAX_COLORS : numOfColors);
    for (const chunkParams of icnsChunks) {
        outBuffer = appendIcnsChunk(chunkParams, srcImage, scalingAlgorithm, outBuffer, nOfColors);
        if (!outBuffer) {
            return null;
        }
        LogMessage(`wrote type ${chunkParams.Type} for size ${chunkParams.Info} with ${chunkParams.Size} pixels`);
    }
    // Write total file size at offset 4 of output and return final result
    outBuffer.writeUInt32BE(outBuffer.length, 4);
    LogMessage("done");
    return outBuffer;
}

////////////////////////////////////////
// Microsoft ICO
////////////////////////////////////////

/**
 * Get the directory header of an ICO file.
 * @see https://en.wikipedia.org/wiki/ICO_(file_format)
 * @param numOfImages Number of images the file will contain.
 * @returns Buffer The ICO header (file level).
 */
function getICONDIR(numOfImages: number): Buffer {
    const iconDir: Buffer = Buffer.alloc(6);
    iconDir.writeUInt16LE(0, 0);            // Reserved. Must always be 0.
    iconDir.writeUInt16LE(1, 2);            // Specifies image type: 1 for icon (.ICO) image, 2 for cursor (.CUR) image. Other values are invalid.
    iconDir.writeUInt16LE(numOfImages, 4);  // Specifies number of images in the file.
    return iconDir;
}

/**
 * Get one entry for the directory header of an ICO file.
 * @see https://en.wikipedia.org/wiki/ICO_(file_format)
 * @param image The image for the icon chunk.
 * @param offset Offset of the image (file level).
 * @param forPNG True for icon chunk in PNG format, false for DIBs.
 * @returns Buffer The header for this icon.
 */
function getICONDIRENTRY(image: Image, offset: number, forPNG: boolean): Buffer {
    const iconDirEntry: Buffer = Buffer.alloc(16);
    const width: number = image.width >= 256 ? 0 : image.width;
    const height: number = image.height >= 256 ? 0 : image.height;
    const bitsPerPixel: number = 32;              // UPNG.toRGBA8 always gives 32 bpp
    const imageSize: number = image.data.length + (forPNG ? 0 : 40);  // Add BITMAPINFOHEADER size depending on output format
    iconDirEntry.writeUInt8(width, 0);            // Specifies image width in pixels. Can be any number between 0 and 255. Value 0 means image width is 256 pixels.
    iconDirEntry.writeUInt8(height, 1);           // Specifies image height in pixels. Can be any number between 0 and 255. Value 0 means image height is 256 pixels.
    iconDirEntry.writeUInt8(0, 2);                // Specifies number of colors in the color palette. Should be 0 if the image does not use a color palette.
    iconDirEntry.writeUInt8(0, 3);                // Reserved. Should be 0.
    iconDirEntry.writeUInt16LE(0, 4);             // In ICO format: Specifies color planes. Should be 0 or 1.
    iconDirEntry.writeUInt16LE(bitsPerPixel, 6);  // In ICO format: Specifies bits per pixel.
    iconDirEntry.writeUInt32LE(imageSize, 8);     // Specifies the size of the image's data in bytes
    iconDirEntry.writeUInt32LE(offset, 12);       // Specifies the offset of BMP or PNG data from the beginning of the ICO/CUR file.
    return iconDirEntry;
}

/**
 * Get the Bitmap Info Header for an entry in the directory.
 * @see https://en.wikipedia.org/wiki/BMP_file_format
 * @param image Image The source image for the entry.
 * @returns Buffer The Bitmap Info Header for the entry.
 */
function getBITMAPINFOHEADER(image: Image): Buffer {
    const buffer: Buffer = Buffer.alloc(40);
    // Height must be doubled because of alpha channel.
    const height: number = image.height * 2;
    const bitsPerPixel: number = 32;              // UPNG.toRGBA8 always gives 32 bpp
    buffer.writeUInt32LE(40, 0);                  // Size of this header (40 bytes)
    buffer.writeInt32LE(image.width, 4);          // Bitmap width in pixels
    buffer.writeInt32LE(height, 8);               // Bitmap height in pixels
    buffer.writeUInt16LE(1, 12);                  // Number of color planes (must be 1)
    buffer.writeUInt16LE(bitsPerPixel, 14);       // Bits per pixel
    buffer.writeUInt32LE(0, 16);                  // Compression method (here always 0).
    buffer.writeUInt32LE(image.data.length, 20);  // Image size (image buffer).
    buffer.writeInt32LE(3780, 24);                // Horizontal resolution of the image (pixels per meter, 3780 = 96 DPI).
    buffer.writeInt32LE(3780, 28);                // Horizontal resolution of the image (pixels per meter, 3780 = 96 DPI).
    buffer.writeUInt32LE(0, 32);                  // Number of colors in the color palette, or 0 to default to 2n
    buffer.writeUInt32LE(0, 36);                  // Number of important colors used, or 0 when every color is important; generally ignored.
    return buffer;
}

/**
 * Get a DIB representation of the raw image data in an image.
 * Bitmap data starts with the lower left hand corner of the image.
 * Pixel order is blue, green, red, alpha.
 * @see https://en.wikipedia.org/wiki/BMP_file_format
 * @param image Source image.
 * @returns Buffer The DIB for the given image.
 */
function getDIB(image: Image): Buffer {
    const bytesPerPixel: number = 4; // UPNG.toRGBA8 always gives 4 bytes per pixel (R-G-B-A)
    const columns: number = image.width * bytesPerPixel;
    const rows: number = image.height * columns;
    const end: number = rows - columns;
    const bitmap: Buffer = Buffer.from(image.data);
    const DIB: Buffer = Buffer.alloc(image.data.length);
    for (let row = 0; row < rows; row += columns) {
        for (let col = 0; col < columns; col += bytesPerPixel) {
            let pos = row + col;
            const r = bitmap.readUInt8(pos);
            const g = bitmap.readUInt8(pos + 1);
            const b = bitmap.readUInt8(pos + 2);
            const a = bitmap.readUInt8(pos + 3);
            pos = (end - row) + col;
            DIB.writeUInt8(b, pos);
            DIB.writeUInt8(g, pos + 1);
            DIB.writeUInt8(r, pos + 2);
            DIB.writeUInt8(a, pos + 3);
        }
    }
    return DIB;
}

/**
 * Scans through a region of the bitmap, calling a function for each pixel.
 * @param x The x coordinate to begin the scan at.
 * @param y The y coordiante to begin the scan at.
 * @param w The width of the scan region.
 * @param h The height of the scan region.
 * @param f A function to call on every pixel; the (x, y) position of the pixel
 *        and the index of the pixel in the bitmap buffer are passed to the function.
 */
function scanImage(image: Image,
                   x: number, y: number,
                   w: number, h: number,
                   f: (sx: number, sy: number, idx: number) => void): void {
    for (let _y = y; _y < (y + h); _y++) {
        for (let _x = x; _x < (x + w); _x++) {
            // tslint:disable-next-line:no-bitwise
            const idx = (image.width * _y + _x) << 2;
            f.call(image, _x, _y, idx);
        }
    }
}

/**
 * Blits a source image onto a target image.
 * @param source The source image.
 * @param target The target image.
 * @param x The x position in target to blit the source image.
 * @param y The y position target to blit the source image.
 */
function blit(source: Image, target: Image, x: number, y: number) {
    x = Math.round(x);
    y = Math.round(y);
    scanImage(source, 0, 0, source.width, source.height, (sx: number, sy: number, idx: number) => {
        if ((x + sx >= 0) && (y + sy >= 0) && (target.width - x - sx > 0) && (target.height - y - sy > 0)) {
            // tslint:disable-next-line:no-bitwise
            const destIdx = (target.width * (y + sy) + (x + sx)) << 2;
            // const destIdx = getPixelIndex(target, x + sx, y + sy);
            target.data[destIdx] = source.data[idx];
            target.data[destIdx + 1] = source.data[idx + 1];
            target.data[destIdx + 2] = source.data[idx + 2];
            target.data[destIdx + 3] = source.data[idx + 3];
        }
    });
}

/**
 * Create the Microsoft ICO format using PNG or Windows bitmaps for every icon.
 * @see https://en.wikipedia.org/wiki/ICO_(file_format)
 * @see resize.js, UPNG.js
 * @param input A raw buffer containing the complete source PNG file.
 * @param scalingAlgorithm One of the supported scaling algorithms for resizing.
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless, other values (<= 256) means lossy).
 *      Only used if "usePNG" is true.
 * @param usePNG Store each chunk in the generated output in either PNG or Windows BMP format.
 *      PNG as opposed to DIB is valid but older Windows versions may not be able to display it.
 * @returns A buffer which contains the binary data of the ICO file or null in case of an error.
 */
export function createICO(input: Buffer, scalingAlgorithm: number,
                          numOfColors: number, usePNG: boolean): Buffer | null {
    // Source for all resizing actions
    let srcImage: Image | null = decodePNG(input);
    if (!srcImage) {
        return null;
    }
    // Make a quadratic source image (seems to be needed for ICO ??) if necessary.
    if (srcImage.height !== srcImage.width) {
        let edgeLength: number;
        let blitX: number;
        let blitY: number;
        if (srcImage.height > srcImage.width) {
            edgeLength = srcImage.height;
            blitX = (srcImage.height - srcImage.width) / 2;
            blitY = 0;
        } else {
            edgeLength = srcImage.width;
            blitX = 0;
            blitY = (srcImage.width - srcImage.height) / 2;
        }
        let alphaBackground: Image | null = {
            data: Buffer.alloc(edgeLength * edgeLength * 4, 0),
            height: edgeLength,
            width: edgeLength,
        };
        blit(srcImage, alphaBackground, blitX, blitY);
        srcImage = alphaBackground;
        alphaBackground = null;
    }
    // All chunk sizes
    const icoChunkSizes: number[] = [16, 32, 48, 256];
    // An array which receives the directory header and all entry headers
    const icoDirectory: Buffer[] = [];
    // Create and append directory header
    icoDirectory.push(getICONDIR(icoChunkSizes.length));
    // Temporary storge for all scaled PNG images
    const icoChunkImages: Buffer[] = [];
    // Initial offset for the first image
    let chunkOffset: number = icoDirectory[0].length + (icoChunkSizes.length * 16); // fixed length of ICONDIRENTRY is 16
    // Process each chunk
    for (const icoChunkSize of icoChunkSizes) {
        // Target rect for scaled image
        const icoChunkRect = stretchRect(
            getRect(0, 0, srcImage.width, srcImage.height),
            getRect(0, 0, icoChunkSize, icoChunkSize),
        );
        // Get scaled raw image
        const scaledRawImage: Image = {
            data: scaleToFit(srcImage, icoChunkRect, scalingAlgorithm),
            height: icoChunkRect.Height,
            width: icoChunkRect.Width,
        };
        // Store entry header, store image and get offset for next image
        icoDirectory.push(getICONDIRENTRY(scaledRawImage, chunkOffset, usePNG));
        if (usePNG) {
            const encodedPNG: ArrayBuffer = UPNG.encode(
                [scaledRawImage.data.buffer],
                icoChunkRect.Width,
                icoChunkRect.Height,
                (numOfColors < 0) ? 0 : ((numOfColors > MAX_COLORS) ? MAX_COLORS : numOfColors),
                [],
                true,
            );
            icoChunkImages.push(Buffer.from(encodedPNG));
            chunkOffset += encodedPNG.byteLength;
        } else {
            const bmpInfoHeader = getBITMAPINFOHEADER(scaledRawImage);
            const DIB = getDIB(scaledRawImage);
            icoChunkImages.push(bmpInfoHeader, DIB);
            chunkOffset += (bmpInfoHeader.length + DIB.length);
        }
        LogMessage(`wrote ${usePNG ? "png" : "bmp"} icon for size ${icoChunkSize}`);
    }
    LogMessage(`done`, totalLength);
    return Buffer.concat(icoDirectory.concat(icoChunkImages), totalLength);
}
