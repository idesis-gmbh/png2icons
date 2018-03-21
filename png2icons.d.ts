/// <reference types="node" />

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
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless, other values (<= 256) means lossy).
 * @returns A buffer which contains the binary data of the ICNS file or null in case of an error.
 */
export declare function createICNS(input: Buffer, scalingAlgorithm: number, numOfColors: number): Buffer | null;

/**
 * Create the Microsoft ICO format using PNG or Windows bitmaps for every icon.
 * @see https://en.wikipedia.org/wiki/ICO_(file_format)
 * @see resize.js, UPNG.js
 * @param input A raw buffer containing the complete source PNG file.
 * @param scalingAlgorithm One of the supported scaling algorithms for resizing.
 * @param numOfColors Maximum colors in output ICO chunks (0 = all colors/lossless, other values (<= 256) means lossy). Only used if "usePNG" is true.
 * @param usePNG Store each chunk in the generated output in either PNG or Windows BMP format.
 *        PNG as opposed to DIB is valid but older Windows versions may not be able to display it.
 * @returns A buffer which contains the binary data of the ICO file or null in case of an error.
 */
export declare function createICO(input: Buffer, scalingAlgorithm: number, numOfColors: number, usePNG: boolean): Buffer | null;

/**
 * Deprecated, see README.md.
 * @deprecated
 */
export declare function PNG2ICNS(input: Buffer, scalingAlgorithm: number, printInfo: boolean, numOfColors: number): Buffer | null;

/**
 * Deprecated, see README.md.
 * @deprecated
 */
export declare function PNG2ICO_PNG(input: Buffer, scalingAlgorithm: number, printInfo: boolean, numOfColors: number): Buffer | null;

/**
 * Deprecated, see README.md.
 * @deprecated
 */
export declare function PNG2ICO_BMP(input: Buffer, scalingAlgorithm: number, printInfo: boolean): Buffer | null;
