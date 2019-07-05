import { Image } from "./Image";

// Resize functions with different interpolation algorithms
export declare function nearestNeighbor(src: Image, dst: Image): void;
export declare function bilinearInterpolation(src: Image, dst: Image): void;
export declare function bicubicInterpolation(src: Image, dst: Image): void;
export declare function hermiteInterpolation(src: Image, dst: Image): void;
export declare function bezierInterpolation(src: Image, dst: Image): void;
