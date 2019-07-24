/// <reference types="node" />
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
/**
 * Logger function type (compatible with console.log).
 */
export declare type Logger = (message: any, ...optionalParams: any[]) => void;
/**
 * Set an external logger for log messages from png2icons and UPNG.
 * Note: If no logger is set, *nothing* will ever be logged, not even errors.
 * @param logger Called with info/error messages during processing.
 */
export declare function setLogger(logger: Logger): void;
/**
 * `Nearest neighbor` resizing interploation algorithm.
 * @see resize3.js
 */
export declare const NEAREST_NEIGHBOR = 0;
/**
 * `Bilinear` resizing interploation algorithm.
 * @see resize3.js
 */
export declare const BILINEAR = 1;
/**
 * `Bicubic` resizing interploation algorithm.
 * @see resize3.js
 */
export declare const BICUBIC = 2;
/**
 * `Bezier` resizing interploation algorithm.
 * @see resize3.js
 */
export declare const BEZIER = 3;
/**
 * `Hermite` resizing interploation algorithm.
 * @see resize3.js
 */
export declare const HERMITE = 4;
/**
 * `Bicubic` resizing interploation algorithm.
 * @see resize4.js
 */
export declare const BICUBIC2 = 5;
/**
 * Clears both image caches (input PNG and scaled images).
 */
export declare function clearCache(): void;
/**
 * Create the Apple ICNS format.
 * @see resize.js, UPNG.js
 * @param input A raw buffer containing the complete source PNG file.
 * @param scalingAlgorithm One of the supported scaling algorithms for resizing.
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless, other values (<= 256) means lossy).
 * @returns A buffer which contains the binary data of the ICNS file or null in case of an error.
 */
export declare function createICNS(input: Buffer, scalingAlgorithm: number, numOfColors: number): Buffer | null;
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
export declare function createICO(input: Buffer, scalingAlgorithm: number, numOfColors: number, PNG: boolean, forWinExe?: boolean): Buffer | null;
