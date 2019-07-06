import { Image } from "./Image";

// Resize functions with different interpolation algorithms
export declare function bilinear(src: Image, dst: Image, scale: number): void;
export declare function bicubic(src: Image, dst: Image, scale: number): void;
