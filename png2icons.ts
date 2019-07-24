import { encode as encodeWithPackBitsForICNS } from "./lib/icns-encoder";
import { Image } from "./lib/Image";
import * as Resize from "./lib/resize3";
import * as Resize4 from "./lib/resize4";
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
 *
 * Packbits compression for certain Apple ICNS icon types:
 * https://github.com/fiahfy/packbits
 * Hints from
 * https://github.com/fiahfy/packbits/issues/1
 * Hints for bitmap masks (method createBitmap) from
 * https://github.com/fiahfy/ico/blob/master/src/index.js
 * Copyright (c) 2018 fiahfy, https://fiahfy.github.io/
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
 * @see resize3.js
 */
export const NEAREST_NEIGHBOR = 0;
/**
 * `Bilinear` resizing interploation algorithm.
 * @see resize3.js
 */
export const BILINEAR = 1;
/**
 * `Bicubic` resizing interploation algorithm.
 * @see resize3.js
 */
export const BICUBIC = 2;
/**
 * `Bezier` resizing interploation algorithm.
 * @see resize3.js
 */
export const BEZIER = 3;
/**
 * `Hermite` resizing interploation algorithm.
 * @see resize3.js
 */
export const HERMITE = 4;
/**
 * `Bicubic` resizing interploation algorithm.
 * @see resize4.js
 */
export const BICUBIC2 = 5;
/**
 * `Bilinear` resizing interploation algorithm.
 * @see resize4.js
 */
// export const BILINEAR2 = 6;

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
function getStretchedRect(src: IRect, dst: IRect): IRect {
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
 * Holds already scaled images (raw pixels).
 */
const scaledImageCache: Image[] = [];

/**
 * Scale a source image to fit into a new given size. The result of the scaling
 * is put to a cache. If the cache already contains a scaled image of the same
 * size this is returned immediately instead. Scaling also isn't done if the
 * source and destination rectangles are the same.
 * @see resize.js
 * @param srcImage Source image.
 * @param destRect Destination rectangle to fit the rescaled image into.
 * @param scalingAlgorithm Scaling method (one of the constants NEAREST_NEIGHBOR, BILINEAR, ...).
 * @returns Uint8Array The rescaled image.
 */
function getScaledImageData(srcImage: Image, destRect: IRect, scalingAlgorithm: number): Uint8Array {
    // Nothing to do
    if ((srcImage.width === destRect.Width) && (srcImage.height === destRect.Height)) {
        return srcImage.data;
    }
    // Already rescaled
    for (const image of scaledImageCache) {
        if ((destRect.Width === image.width) && (destRect.Height === image.height)) {
            return image.data;
        }
    }
    const scaleResult: Image = {
        data: new Uint8Array(destRect.Width * destRect.Height * 4),
        height: destRect.Height,
        width: destRect.Width,
    };
    if (scalingAlgorithm === NEAREST_NEIGHBOR) {
        Resize.nearestNeighbor(srcImage, scaleResult);
    } else if (scalingAlgorithm === BILINEAR) {
        Resize.bilinearInterpolation(srcImage, scaleResult);
    } else if (scalingAlgorithm === BICUBIC) {
        Resize.bicubicInterpolation(srcImage, scaleResult);
    } else if (scalingAlgorithm === BEZIER) {
        Resize.bezierInterpolation(srcImage, scaleResult);
    } else if (scalingAlgorithm === HERMITE) {
        Resize.hermiteInterpolation(srcImage, scaleResult);
    } else if (scalingAlgorithm === BICUBIC2) {
        Resize4.bicubic(srcImage, scaleResult, destRect.Width / srcImage.width);
    // } else if (scalingAlgorithm === BILINEAR2) {
    //     Resize4.bilinear(srcImage, scaleResult, destRect.Width / srcImage.width);
    } else {
        Resize.bicubicInterpolation(srcImage, scaleResult);
    }
    scaledImageCache.push(scaleResult);
    return scaleResult.data;
}

/**
 * Create an image form a PNG.
 * @param input A buffer containing the raw PNG data/file.
 * @returns Image An image containing the raw bitmap and the image dimensions.
 * @see Declaration image.d.ts.
 */
function getImageFromPNG(input: Buffer): Image | null {
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

/**
 * An already PNG encoded image.
 */
interface IPNGImage {
    // tslint:disable-next-line: completed-docs
    Data: ArrayBuffer;
    // tslint:disable-next-line: completed-docs
    Width: number;
    // tslint:disable-next-line: completed-docs
    Height: number;
}

/**
 * Holds already scaled images (PNG encoded).
 */
const scaledPNGImageCache: IPNGImage[] = [];

/**
 * Encode a raw RGBA image to PNG. The result of the encoding is put to a cache.
 * If the cache already contains a PNG image of the same size this is returned
 * immediately instead.
 * @param rgba An ArrayBuffer holding the raw RGBA image data.
 * @param width Width of the image to be encoded.
 * @param height Height of the image to be encoded.
 * @param numOfColors Number of colors to reduce to.
 * @returns A PNG image.
 */
function getCachedPNG(rgba: ArrayBuffer, width: number, height: number, numOfColors: number) {
    // Already encoded
    for (const image of scaledPNGImageCache) {
        if ((image.Width === width) && (image.Height === height)) {
            return image.Data;
        }
    }
    const result = UPNG.encode([rgba], width, height, numOfColors, [], true);
    scaledPNGImageCache.push({
        Data: result,
        Width: width,
        Height: height,
    });
    return result;
}

/**
 * The image which is currently processed.
 * @see function `checkCache()`.
 */
let currentImage: Buffer | null = null;

/**
 * Checks if the given image has been cached/processed already. If the
 * given image differs from the current one both caches are cleared.
 * @param image The (new) input image.
 */
function checkCache(image: Buffer): void {
    if (!image) {
        return;
    }
    if (!currentImage) {
        currentImage = image;
        return;
    }
    if (image.compare(currentImage) !== 0) {
        clearCache();
        currentImage = image;
    }
}

/**
 * Clears both image caches (input PNG and scaled images).
 */
export function clearCache(): void {
    scaledPNGImageCache.length = 0;
    scaledImageCache.length = 0;
    currentImage = null;
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
 * Create a quadratic image form a non quadratic image. The source image
 * will be centered horizontally and vertically onto the result image.
 * The "non-used" pixels in the target image are used as an alpha channel.
 * @param image A non-quadratic image.
 * @returns A quadratic image.
 */
function getQuadraticImage(image: Image): Image {
    if (image.height === image.width) {
        return image;
    }
    let edgeLength: number;
    let blitX: number;
    let blitY: number;
    if (image.height > image.width) {
        edgeLength = image.height;
        blitX = (image.height - image.width) / 2;
        blitY = 0;
    } else {
        edgeLength = image.width;
        blitX = 0;
        blitY = (image.width - image.height) / 2;
    }
    const result: Image | null = {
        data: new Uint8Array(edgeLength * edgeLength * 4),
        height: edgeLength,
        width: edgeLength,
    };
    blit(image, result, blitX, blitY);
    return result;
}

/**
 * Extract a single channel of an image with n bytes per pixel, e. g. in RGBA format.
 * @param image Input image.
 * @param bpp Number of bytes per pixel.
 * @param channelIndex Position of the channel byte in the <bpp>-value for each pixel.
 * @returns The extracted channel.
 */
function getImageChannel(image: Uint8Array, bpp: number, channelIndex: number): Buffer {
    const channel: Buffer = Buffer.alloc(image.length / bpp);
    const length: number = image.length;
    let outPos: number = 0;
    for (let i = channelIndex; i < length; i = i + 4) {
        channel.writeUInt8(image[i], outPos++);
    }
    return channel;
}

////////////////////////////////////////
// Apple ICNS
////////////////////////////////////////

/**
 * Icon format
 */
enum IconFormat {
    /**
     * Compression type PNG for icon.
     */
    PNG,
    /**
     * Compression type ARGB PackBits (for icon types ic05 and ic04).
     */
    PackBitsARGB,
    /**
     * Compression type RGB PackBits (for icon types il32 and is32).
     */
    PackBitsRGB,
    /**
     * (Uncompressed) alpha channel only (for icon masks l8mk and s8mk).
     */
    Alpha,
}

/**
 * Data for one icon chunk.
 */
interface IICNSChunkParams {
    /**
     * Magic number for icon type.
     */
    OSType: string;
    /**
     * (Compression) Type for icon.
     */
    Format: IconFormat;
    /**
     * Icon output size.
     */
    Size: number;
    /**
     * Info for logging.
     */
    Info: string;
}

/**
 * Convert an RGBA image into a PackBits compressed (A)RBG image, (with header).
 * @param image Input image in RGBA format.
 * @param withAlphaChannel Write out an alpha channel and the appropriate header.
 * @returns Output image in (A)RGB format, compressed with PackBits and preceeded by
 *          an "ARGB" header, if applicable.
 */
function encodeIconWithPackBits(image: Buffer, withAlphaChannel: boolean): Uint8Array {
    const R: Buffer = encodeWithPackBitsForICNS(getImageChannel(image, 4, 0));
    const G: Buffer = encodeWithPackBitsForICNS(getImageChannel(image, 4, 1));
    const B: Buffer = encodeWithPackBitsForICNS(getImageChannel(image, 4, 2));
    if (withAlphaChannel) {
        const header: Buffer = Buffer.alloc(4);
        header.write("ARGB", 0, 4, "ascii");
        const A: Buffer = encodeWithPackBitsForICNS(getImageChannel(image, 4, 3));
        return Buffer.concat([header, A, R, G, B], header.length + A.length + R.length + G.length + B.length);
    } else {
        return Buffer.concat([R, G, B], R.length + G.length + B.length);
    }
}

/**
 * Create and append an ICNS icon chunk to the final result buffer.
 * @see resize.js, UPNG.js
 * @param chunkParams Object which configures the icon chunk generation.
 * @param srcImage The source image.
 * @param scalingAlgorithm Scaling method (one of the constants NEAREST_NEIGHBOR, BILINEAR, ...).
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless, other values (> 0) means lossy).
 * @param outBuffer The buffer where the generated chunk *shall be* appended to.
 * @returns The buffer where the generated chunk *has been* appended to (outbuffer+icon chunk)
 *          or null if an error occured.
 */
function appendIcnsChunk(chunkParams: IICNSChunkParams, srcImage: Image, scalingAlgorithm: number,
                         numOfColors: number, outBuffer: Buffer): Buffer | null {
    try {
        // Fit source rect to target rect
        const icnsChunkRect: IRect = getStretchedRect(
            getRect(0, 0, srcImage.width, srcImage.height),
            getRect(0, 0, chunkParams.Size,
                chunkParams.Size),
        );
        // Scale image
        const scaledRawData: Uint8Array = getScaledImageData(srcImage, icnsChunkRect, scalingAlgorithm);
        // Icon buffer
        let encodedIcon: ArrayBuffer;
        // Header bytes or every icon
        const iconHeader: Buffer = Buffer.alloc(8);
        // Write icon header, eg 'ic10' + (length of icon + icon header length)
        iconHeader.write(chunkParams.OSType, 0);
        // Write icon
        switch (chunkParams.Format) {
            case IconFormat.PNG:
                encodedIcon = getCachedPNG(
                    scaledRawData.buffer,
                    icnsChunkRect.Width,
                    icnsChunkRect.Height,
                    numOfColors,
                );
                break;

            case IconFormat.PackBitsARGB:
                encodedIcon = encodeIconWithPackBits(Buffer.from(scaledRawData.buffer), true);
                break;

            case IconFormat.PackBitsRGB:
                encodedIcon = encodeIconWithPackBits(Buffer.from(scaledRawData.buffer), false);
                break;

            case IconFormat.Alpha:
                // Aplpha channel is provided as is.
                encodedIcon = getImageChannel(Buffer.from(scaledRawData.buffer), 4, 3);
                break;

            default:
                throw new Error("Unknown format for icon (must be PNG, PackBitsARGB, PackBitsRGB or Alpha)");
        }
        // Size of chunk = encoded icon size + icon header length
        iconHeader.writeUInt32BE(encodedIcon.byteLength + 8, 4);
        return Buffer.concat(
            [outBuffer, iconHeader, Buffer.from(encodedIcon)],
            outBuffer.length + iconHeader.length + encodedIcon.byteLength,
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
    // Handle caching of input.
    checkCache(input);
    // Source for all resizing actions
    let inputImage: Image | null = getImageFromPNG(input);
    if (!inputImage) {
        return null;
    }
    // Make source image quadratic.
    const srcImage = getQuadraticImage(inputImage);
    inputImage = null;
    // All available chunk types
    const icnsChunks: IICNSChunkParams[] = [
        // Note: Strange enough, but the order of the different chunks in the output file
        // seems to be relevant if ic04 and ic05 packbits icons are used. For example, if
        // they are placed at the end of the file the Finder and the Preview app are unable
        // to display them correctly. The position doesn't seem to have an impact for PNG
        // encoded icons, only for those two icons. ic04 and ic05 are supported on versions
        // 10.14 and newer but they don't seem to have a negative impact on older versions,
        // they are simply ignored. Nevertheless png2icons uses is32 and il32 for better
        // support on older versions.
        // The following order is the same of that created by iconutil on 10.14.
        { OSType: "ic12", Format: IconFormat.PNG, Size: 64, Info: "32x32@2  " },
        { OSType: "ic07", Format: IconFormat.PNG, Size: 128, Info: "128x128  " },
        { OSType: "ic13", Format: IconFormat.PNG, Size: 256, Info: "128x128@2" },
        { OSType: "ic08", Format: IconFormat.PNG, Size: 256, Info: "256x256  " },
        // { OSType: "ic04", Format: IconFormat.PackBitsARGB, Size: 16,   Info: "16x16    " },
        { OSType: "ic14", Format: IconFormat.PNG, Size: 512, Info: "256x256@2" },
        { OSType: "ic09", Format: IconFormat.PNG, Size: 512, Info: "512x512  " },
        // { OSType: "ic05", Format: IconFormat.PackBitsARGB, Size: 32,   Info: "32x32    " },
        { OSType: "ic10", Format: IconFormat.PNG, Size: 1024, Info: "512x512@2" },
        { OSType: "ic11", Format: IconFormat.PNG, Size: 32, Info: "16x16@2  " },
        // Important note:
        // The types il32 and is32 have to be Packbits encoded in RGB and they *need*
        // a *corresponding separate mask icon entry*. This mask contains an *uncompressed*
        // alpha channel with the same image dimensions.
        // Finding information on this was nearly impossible, the only source which finally
        // led to the solution was this documentation from the stone ages:
        // https://books.google.de/books?id=MTNUf464tHwC&pg=PA434&lpg=PA434&dq=mac+is32+icns&source=bl&ots=0fZ2g1qiia&sig=ACfU3U0uEMDeLkjeRL6CgD9_G_bPHasmEw&hl=de&sa=X&ved=2ahUKEwi_pYH0-5PjAhUGZ1AKHRx7CWMQ6AEwBnoECAkQAQ#v=onepage&q=mac%20is32%20icns&f=false
        { OSType: "il32", Format: IconFormat.PackBitsRGB, Size: 32, Info: "32x32    " },
        { OSType: "l8mk", Format: IconFormat.Alpha, Size: 32, Info: "32x32    " },
        { OSType: "is32", Format: IconFormat.PackBitsRGB, Size: 16, Info: "16x16    " },
        { OSType: "s8mk", Format: IconFormat.Alpha, Size: 16, Info: "16x16    " },
        // icp5 and icp4 would be an alternative and the Preview app displays them correctly
        // but they don't work in Finder. They also seem to be unsupported in older
        // versions (e. g. 10.12).
        // { OSType: "icp5", Format: IconFormat.PNG,     Size: 32,   Info: "32x32    " },
        // { OSType: "icp4", Format: IconFormat.PNG,     Size: 16,   Info: "16x16    " },
    ];
    // ICNS header, "icns" + length of file (written later)
    let outBuffer: Buffer | null = Buffer.alloc(8, 0);
    outBuffer.write("icns", 0);
    // Append all icon chunks
    const nOfColors: number = (numOfColors < 0) ? 0 : ((numOfColors > MAX_COLORS) ? MAX_COLORS : numOfColors);
    for (const chunkParams of icnsChunks) {
        outBuffer = appendIcnsChunk(chunkParams, srcImage, scalingAlgorithm, nOfColors, outBuffer);
        if (!outBuffer) {
            return null;
        }
        LogMessage(`wrote type ${chunkParams.OSType} for size ${chunkParams.Info} with ${chunkParams.Size} pixels`);
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
 * Length of Windows BMP header.
 */
const BITMAPINFOHEADERLENGTH: number = 40;

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
 * @param imageSize Total length in bytes of the image for the icon chunk.
 * @param width Width of the image for the icon chunk.
 * @param height Height of the image for the icon chunk.
 * @param offset Offset of the image (file level).
 * @returns Buffer The header for this icon.
 */
function getICONDIRENTRY(imageSize: number, width: number, height: number, offset: number): Buffer {
    const iconDirEntry: Buffer = Buffer.alloc(16);
    width = width >= 256 ? 0 : width;
    height = height >= 256 ? 0 : height;
    iconDirEntry.writeUInt8(width, 0);            // Specifies image width in pixels. Can be any number between 0 and 255. Value 0 means image width is 256 pixels.
    iconDirEntry.writeUInt8(height, 1);           // Specifies image height in pixels. Can be any number between 0 and 255. Value 0 means image height is 256 pixels.
    iconDirEntry.writeUInt8(0, 2);                // Specifies number of colors in the color palette. Should be 0 if the image does not use a color palette.
    iconDirEntry.writeUInt8(0, 3);                // Reserved. Should be 0.
    iconDirEntry.writeUInt16LE(1, 4);             // In ICO format: Specifies color planes. Should be 0 or 1.
    iconDirEntry.writeUInt16LE(32, 6);            // In ICO format: Specifies bits per pixel (UPNG.toRGBA8 always gives 4 bytes per pixel (RGBA)).
    iconDirEntry.writeUInt32LE(imageSize, 8);     // Specifies the size of the image's data in bytes
    iconDirEntry.writeUInt32LE(offset, 12);       // Specifies the offset of BMP or PNG data from the beginning of the ICO/CUR file.
    return iconDirEntry;
}

/**
 * Calculate the size of the mask for the alpha channel.
 * @param bitmapWidth Width of the bitmap.
 * @param bitmapHeight Height of the bitmap.
 * @see https://github.com/fiahfy/ico.
 * @returns The size of the mask in bytes.
 */
function getMaskSize(bitmapWidth: number, bitmapHeight: number): number {
    return (bitmapWidth + (bitmapWidth % 32 ? 32 - bitmapWidth % 32 : 0)) * bitmapHeight / 8;
}

/**
 * Get the Bitmap Info Header for an entry in the directory.
 * @see https://en.wikipedia.org/wiki/BMP_file_format
 * @param image Image The source image for the entry.
 * @returns Buffer The Bitmap Info Header for the entry.
 */
function getBITMAPINFOHEADER(image: Image): Buffer {
    const buffer: Buffer = Buffer.alloc(BITMAPINFOHEADERLENGTH);
    const imageSize = image.data.length + getMaskSize(image.width, image.height);
    buffer.writeUInt32LE(40, 0);               // Size of this header (40 bytes).
    buffer.writeInt32LE(image.width, 4);       // Bitmap width in pixels.
    buffer.writeInt32LE(image.height * 2, 8);  // Bitmap height in pixels (must be doubled because of alpha channel).
    buffer.writeUInt16LE(1, 12);               // Number of color planes (must be 1).
    buffer.writeUInt16LE(32, 14);              // Bits per pixel (UPNG.toRGBA8 always gives 4 bytes per pixel (RGBA)).
    buffer.writeUInt32LE(0, 16);               // Compression method (here always 0).
    buffer.writeUInt32LE(imageSize, 20);       // Image size (image buffer + padding).
    buffer.writeInt32LE(3780, 24);             // Horizontal resolution of the image (pixels per meter, 3780 = 96 DPI).
    buffer.writeInt32LE(3780, 28);             // Horizontal resolution of the image (pixels per meter, 3780 = 96 DPI).
    buffer.writeUInt32LE(0, 32);               // Number of colors in the color palette, or 0 to default to 2^n.
    buffer.writeUInt32LE(0, 36);               // Number of important colors used, or 0 when every color is important; generally ignored.
    return buffer;
}

/**
 * Get a DIB representation of the raw image data in a DIB with a mask.
 * Bitmap data starts with the lower left hand corner of the image.
 * Pixel order is blue, green, red, alpha.
 * @see https://en.wikipedia.org/wiki/BMP_file_format
 * @param image Source image.
 * @returns Buffer The DIB for the given image.
 */
function getDIB(image: Image): Buffer {
    // Source bitmap
    const bitmap: Buffer = Buffer.from(image.data);
    // Target bitmap
    const DIB: Buffer = Buffer.alloc(image.data.length);
    // Mask data
    const maskSize: number = getMaskSize(image.width, image.height);
    let maskBits: number[] = [];
    // Change order from lower to top
    const bytesPerPixel: number = 4;
    const columns: number = image.width * bytesPerPixel;
    const rows: number = image.height * columns;
    const end: number = rows - columns;
    for (let row = 0; row < rows; row += columns) {
        for (let col = 0; col < columns; col += bytesPerPixel) {
            // Swap pixels from RGBA to BGRA
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
            // Store mask bit
            maskBits.push(bitmap[pos + 3] === 0 ? 1 : 0);
        }
        const padding = maskBits.length % 32 ? 32 - maskBits.length % 32 : 0;
        maskBits = maskBits.concat(Array(padding).fill(0));
    }
    // Create mask from mask bits
    const mask: Buffer[] = [];
    for (let i = 0; i < maskBits.length; i += 8) {
        const n: number = parseInt(maskBits.slice(i, i + 8).join(""), 2);
        const buf: Buffer = Buffer.alloc(1);
        buf.writeUInt8(n, 0);
        mask.push(buf);
    }
    return Buffer.concat([DIB, Buffer.concat(mask, maskSize)]);
}

/**
 * Create the Microsoft ICO format using PNG and/or Windows bitmaps for every icon.
 * @see https://en.wikipedia.org/wiki/ICO_(file_format)
 * @see resize.js, UPNG.js
 * @param input A raw buffer containing the complete source PNG file.
 * @param scalingAlgorithm One of the supported scaling algorithms for resizing.
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless, other values
 *        (<= 256) means lossy). Only used if "PNG" is true.
 * @param PNG Store each chunk in the generated output in either PNG or Windows BMP format. PNG
 *        as opposed to DIB is valid but older Windows versions may not be able to display it.
 * @param forWinExe Optional. If true all icons will be stored as PNGs, only the sizes smaller
 *        than 64 will be stored as BMPs. This avoids display problems with the icon in the file
 *        properties dialog of Windows versions older than Windows 10. Should be set to true if
 *        the ICO file is intended to be used for embeddingin a Windows executable. If used, the
 *        parameter PNG is ignored.
 * @returns A buffer which contains the binary data of the ICO file or null in case of an error.
 */
export function createICO(input: Buffer, scalingAlgorithm: number,
                          numOfColors: number, PNG: boolean, forWinExe?: boolean): Buffer | null {
    // Handle caching of input.
    checkCache(input);
    // Source for all resizing actions
    let inputImage: Image | null = getImageFromPNG(input);
    if (!inputImage) {
        return null;
    }
    // Make source image quadratic.
    const srcImage = getQuadraticImage(inputImage);
    inputImage = null;
    // All chunk sizes
    const icoChunkSizes: number[] = [256, 128, 96, 72, 64, 48, 32, 24, 16];
    // An array which receives the directory header and all entry headers
    const icoDirectory: Buffer[] = [];
    // Create and append directory header
    icoDirectory.push(getICONDIR(icoChunkSizes.length));
    // Final total length of all buffers.
    let totalLength: number = icoDirectory[0].length; // ICONDIR header
    // Temporary storage for all scaled images
    const icoChunkImages: Buffer[] = [];
    // Initial offset for the first image
    let chunkOffset: number = icoDirectory[0].length + (icoChunkSizes.length * 16); // fixed length of ICONDIRENTRY is 16
    // Process each chunk
    for (const icoChunkSize of icoChunkSizes) {
        // Target rect for scaled image
        const icoChunkRect = getStretchedRect(
            getRect(0, 0, srcImage.width, srcImage.height),
            getRect(0, 0, icoChunkSize, icoChunkSize),
        );
        // Get scaled raw image
        const scaledRawImage: Image = {
            data: getScaledImageData(srcImage, icoChunkRect, scalingAlgorithm),
            height: icoChunkRect.Height,
            width: icoChunkRect.Width,
        };
        // Make icon
        let formatInfo: string;
        // In Windows executable mode use PNG only for sizes >= 64.
        if (PNG || (forWinExe && ([256, 128, 96, 72, 64].indexOf(icoChunkRect.Height) !== -1))) {
            formatInfo = "png";
            const encodedIcon = getCachedPNG(
                scaledRawImage.data.buffer,
                scaledRawImage.width,
                scaledRawImage.height,
                (numOfColors < 0) ? 0 : ((numOfColors > MAX_COLORS) ? MAX_COLORS : numOfColors),
            );
            const iconDirEntry: Buffer = getICONDIRENTRY(
                encodedIcon.byteLength,
                scaledRawImage.width,
                scaledRawImage.height,
                chunkOffset,
            );
            icoDirectory.push(iconDirEntry);
            icoChunkImages.push(Buffer.from(encodedIcon));
            totalLength += iconDirEntry.length + encodedIcon.byteLength;
            chunkOffset += encodedIcon.byteLength;
        } else {
            formatInfo = "bmp";
            const iconDirEntry: Buffer = getICONDIRENTRY(
                scaledRawImage.data.length
                    + getMaskSize(scaledRawImage.width, scaledRawImage.height)
                    + BITMAPINFOHEADERLENGTH,
                scaledRawImage.width,
                scaledRawImage.height,
                chunkOffset,
            );
            icoDirectory.push(iconDirEntry);
            const bmpInfoHeader = getBITMAPINFOHEADER(scaledRawImage);
            const DIB = getDIB(scaledRawImage);
            icoChunkImages.push(bmpInfoHeader, DIB);
            totalLength += iconDirEntry.length + bmpInfoHeader.length + DIB.length;
            chunkOffset += bmpInfoHeader.length + DIB.length;
        }
        LogMessage(`wrote ${formatInfo} icon for size ${icoChunkSize}`);
    }
    LogMessage(`done`);
    return Buffer.concat(icoDirectory.concat(icoChunkImages), totalLength);
}
