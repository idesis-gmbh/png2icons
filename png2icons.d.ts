/// <reference types="node" />
/**
 * Interploation algorithms for resizing.
 * @see resize.js
 */
export declare const NEAREST_NEIGHBOR = 0;
export declare const BILINEAR = 1;
export declare const BICUBIC = 2;
export declare const BEZIER = 3;
export declare const HERMITE = 4;
/**
 * Create the Apple ICNS format.
 * @see resize.js, UPNG.js
 * @param input A raw buffer containing the complete source PNG file.
 * @param scalingAlgorithm One of the supported scaling algorithms for resizing.
 * @param printInfo Write infos/errors to console during processing.
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless, other values (> 0) means lossy).
 * @returns A buffer which contains the binary data of the ICNS file or null in case of an error.
 */
export declare function PNG2ICNS(input: Buffer, scalingAlgorithm: number, printInfo: boolean, numOfColors: number): Buffer | null;
/**
 * Create the Microsoft ICO format using PNG for every icon.
 * @see https://en.wikipedia.org/wiki/ICO_(file_format)
 * @see resize.js, UPNG.js
 * @param input A raw buffer containing the complete source PNG file.
 * @param scalingAlgorithm One of the supported scaling algorithms for resizing.
 * @param printInfo Write infos/errors to console during processing.
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless,
 *        other values (> 0) means lossy). Only used if "usePNG" is true.
 * @returns A buffer which contains the binary data of the ICO file or null in case of an error.
 */
export declare function PNG2ICO_PNG(input: Buffer, scalingAlgorithm: number, printInfo: boolean, numOfColors: number): Buffer | null;
/**
 * Create the Microsoft ICO format using BMP for every icon.
 * @see https://en.wikipedia.org/wiki/ICO_(file_format)
 * @see resize.js, UPNG.js
 * @param input A raw buffer containing the complete source PNG file.
 * @param scalingAlgorithm One of the supported scaling algorithms for resizing.
 * @param printInfo Write infos/errors to console during processing.
 * @returns A buffer which contains the binary data of the ICO file or null in case of an error.
 */
export declare function PNG2ICO_BMP(input: Buffer, scalingAlgorithm: number, printInfo: boolean): Buffer | null;
