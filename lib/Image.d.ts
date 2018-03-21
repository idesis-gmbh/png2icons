// Internal raw representation for an image.
// Used for the down-/upscaling methods, which
// use an Uint8Array.
export declare interface Image {
    data: Uint8Array; // Raw bitmap without any header
    height: number;
    width: number;
}
