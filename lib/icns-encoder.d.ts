/**
 * Compress an input image channel with PackBits, suitable for Apple ICNS icon.
 * @param channel Raw image channel (one of ARGB).
 * @returns Packbits compressed channel (compression with regard to Apple ICNS format).
 */
export declare function encode(channel: Buffer): Buffer;
/**
 * Uncompress a PackBits (Apple ICNS) compressed input channel.
 * @param channel Compressed input channel (one of ARGB).
 * @returns Uncompressed channel.
 */
export declare function decode(buffer: Buffer): Buffer;
