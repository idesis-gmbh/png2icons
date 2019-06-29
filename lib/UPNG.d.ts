// UPNG.js types and functions

export declare enum CTYPE {
    GRAYSCALE = 0,
    UNSUPPORTED_1,   // 1, not used
    RGB,             // 2
    PALETTE,         // 3
    GRAYSCALE_ALPHA, // 4
    UNSUPPORTED_5,   // 5, not used
    RGB_ALPHA,       // 6
}

export declare interface UPNGImage {
    width: number;
    height: number;
    depth: number;
    ctype: CTYPE;
    // tslint:disable-next-line:no-any
    frames: any[];
    tabs: {};
    data: ArrayBuffer;
}

export declare function encode(rgba: ArrayBuffer[], width: number, height: number, cnum: number, dels: number[], forbidPlte?: boolean): ArrayBuffer;
export declare function decode(buffer: ArrayBuffer): UPNGImage;
export declare function toRGBA8(img: UPNGImage): ArrayBuffer[];
