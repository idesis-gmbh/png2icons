// UPNG.js types and functions

export declare enum CTYPE {
    GRAYSCALE = 0,
    UNSUPPORTED_1,
    RGB,
    PALETTE,
    GRAYSCALE_ALPHA,
    UNSUPPORTED_5,
    RGB_ALPHA,
}

export declare interface UPNGImage {
    width: number;
    height: number;
    depth: number;
    ctype: CTYPE;
    tabs: {};
    data: ArrayBuffer;
}

export declare function encode(rgba: ArrayBuffer, width: number, height: number, cnum: number): ArrayBuffer;
export declare function decode(buffer: ArrayBuffer): UPNGImage;
export declare function toRGBA8(img: UPNGImage): Uint8Array;
