#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { parse, resolve } from "path";
import * as PNG2ICONS from "./png2icons";

/**
 * Number of arguments.
 */
const argc: number = process.argv.length;
/**
 * Name of "executable".
 */
const cli: string = parse(__filename).name;
/**
 * Desired output format.
 */
let outputFormat: string;
/**
 * Scaling algorithm to use.
 */
let scalingAlgorithm: number = PNG2ICONS.BICUBIC;
/**
 * Log to console?
 */
let printInfo: boolean = false;

/**
 * Names of scaling algorithms.
 */
const scalingAlgorithms = [
    "Nearest Neighbor",
    "Bilinear",
    "Bicubic",
    "Bezier",
    "Hermite",
];

/**
 * Simple logging to console.
 * @param message The main message to log.
 * @param optionalParams Additional messages to log.
 */
const consoleLogger: PNG2ICONS.Logger = (message: any, ...optionalParams: any[]) => {
    // Always log errors, regardless of printInfo. By convention all code must
    // call this method with an Error as the *last* parameter if an error occured.
    const err: Error = optionalParams[optionalParams.length - 1];
    if (err instanceof Error) {
        console.error(message, ...optionalParams[0], "\n", ...optionalParams.slice(1, optionalParams.length - 1), err.stack);
    } else if (printInfo) {
        console.log(message, ...optionalParams);
    }
};

/**
 * Print usage.
 */
function printUsage(): void {
    const usage: string =
`usage: ${cli} infile outfile format [-nn | - bl | -bc | -bz | -hm] [-i]

Don\'t append a file extension to outfile, it will be set automatically.

format  (output format):
  -icns  Apple ICNS format, creates <outfile>.icns
  -ico   Windows ICO format, creates <outfile>.ico (contained icons as BMP)
  -icop  Windows ICO format, creates <outfile>.ico (contained icons as PNG)
  -all   Create both ICNS and ICO format (ICO with BMP)
  -allp  Create both ICNS and ICO format (ICO with PNG)

Scaling algorithms:
  -nn (Nearest Neighbor)
  -bl (Bilinear)
  -bc (Bicubic, default)
  -bz (Bezier)
  -hm (Hermite)

-i  print messages`;
    console.log(usage);
    process.exit(1);
}

/**
 * Get arguments.
 * @param arg Argument to evaluate.
 */
function evalArg(arg: string): void {
    if (arg === "-nn") {
        scalingAlgorithm = PNG2ICONS.NEAREST_NEIGHBOR;
    } else if (arg === "-bl") {
        scalingAlgorithm = PNG2ICONS.BILINEAR;
    } else if (arg === "-bc") {
        scalingAlgorithm = PNG2ICONS.BICUBIC;
    } else if (arg === "-bz") {
        scalingAlgorithm = PNG2ICONS.BEZIER;
    } else if (arg === "-hm") {
        scalingAlgorithm = PNG2ICONS.HERMITE;
    } else if (arg === "-i") {
        printInfo = true;
    }
}

// Invalid argc or unknown args.
if ((argc < 5) || (argc > 7)) {
    printUsage();
}
outputFormat = process.argv[4];
if (["-icns", "-ico", "-icop", "-all", "-allp"].indexOf(outputFormat) === -1) {
    printUsage();
}
for (let i = 5; i < argc; i++) {
    if (["-nn", "-bl", "-bc", "-bz", "-hm", "-i"].indexOf(process.argv[i]) === -1) {
        printUsage();
    }
}

// Either only debug or only a scaling algorithm is set.
evalArg(process.argv[5]);
if (argc === 7) {
    // -i used twice
    if (printInfo && (process.argv[6] === "-i")) {
        printUsage();
    } else {
        evalArg(process.argv[6]);
        // Two scaling algorithms instead of -i given
        if (!printInfo) {
            printUsage();
        }
    }
}

// Main
/**
 * Describes a task object to be executed.
 */
interface ITask {
    Format: string;
    UsePNG: boolean;
    FileExt: string;
    ConverterFnc: (input: Buffer, scalingAlgorithm: number, numOfColors: number, usePNG?: boolean) => Buffer | null;
}

/**
 * An array for all tasks to be executed.
 */
const tasks: ITask[] = [];

if (outputFormat === "-icns") {
    tasks.push({ Format: "ICNS", UsePNG: true, FileExt: "icns", ConverterFnc: PNG2ICONS.createICNS });
} else if (outputFormat === "-ico") {
    tasks.push({ Format: "ICO (BMP)", UsePNG: false, FileExt: "ico", ConverterFnc: PNG2ICONS.createICO });
} else if (outputFormat === "-icop") {
    tasks.push({ Format: "ICO (PNG)", UsePNG: true, FileExt: "ico", ConverterFnc: PNG2ICONS.createICO });
} else if (outputFormat === "-all") {
    tasks.push({ Format: "ICNS", UsePNG: true, FileExt: "icns", ConverterFnc: PNG2ICONS.createICNS });
    tasks.push({ Format: "ICO (BMP)", UsePNG: false, FileExt: "ico", ConverterFnc: PNG2ICONS.createICO});
} else if (outputFormat === "-allp") {
    tasks.push({ Format: "ICNS", UsePNG: true, FileExt: "icns", ConverterFnc: PNG2ICONS.createICNS });
    tasks.push({ Format: "ICO (PNG)", UsePNG: true, FileExt: "ico", ConverterFnc: PNG2ICONS.createICO});
} else { // ??
    printUsage();
}

PNG2ICONS.setLogger(consoleLogger);

/**
 * The input file (PNG format).
 */
const inputFile: string = resolve(process.argv[2]);
/**
 * The output file name (without extension).
 */
const outputFileStub: string = resolve(process.argv[3]);
/**
 * The buffer containing the complete content of the input PNG file.
 */
const input: Buffer = readFileSync(resolve(inputFile));

for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskInfo: string =
`${cli}
  input:    ${inputFile}
  output:   ${outputFileStub}.${task.FileExt}
  scaling:  ${scalingAlgorithms[scalingAlgorithm]}
  format:   ${task.Format}`;
    consoleLogger(taskInfo);
    const output: Buffer | null = task.ConverterFnc(input, scalingAlgorithm, 0, task.UsePNG);
    if (output) {
        writeFileSync(`${outputFileStub}.${task.FileExt}`, output);
    }
    if ((printInfo) && (tasks.length > 1) && (i < tasks.length - 1)) {
        consoleLogger("");
    }
}
