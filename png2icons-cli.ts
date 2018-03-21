#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { parse, resolve } from "path";
import * as PNG2ICONS from "./png2icons";

const argc: number = process.argv.length;
const cli: string = parse(__filename).name;
let outputFormat: string;
let scalingAlgorithm: number = PNG2ICONS.BICUBIC;
let printInfo: boolean = false;

const scalingAlgorithms = [
    "Nearest Neighbor",
    "Bilinear",
    "Bicubic",
    "Bezier",
    "Hermite",
];

// Simple logging to console
// tslint:disable-next-line:no-any
const consoleLogger: PNG2ICONS.Logger = (message: any, ...optionalParams: any[]) => {
    // Always log errors, regardless of printInfo. By convention all code must
    // call this method with an Error as the *last* parameter if an error occured.
    const err: Error = optionalParams[optionalParams.length-1];
    if (err instanceof Error) {
        console.error(message, ...optionalParams[0], "\n", ...optionalParams.slice(1, optionalParams.length-1), err.stack);
    } else if (printInfo) {
        console.log(message, ...optionalParams);
    }
};

// Print usage
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

// Get arguments
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

// Invalid argc or unknown args
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

// Either only debug or only a scaling algorithm is set
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
interface Task {
    Format: string;
    UsePNG: boolean;
    FileExt: string;
    ConverterFnc: (input: Buffer, scalingAlgorithm: number, numOfColors: number, usePNG?: boolean) => Buffer | null;
}

const Tasks: Array<Task> = [];

if (outputFormat === "-icns") {
    Tasks.push( { Format: "ICNS", UsePNG: true, FileExt: "icns", ConverterFnc: PNG2ICONS.createICNS } );
} else if (outputFormat === "-ico") {
    Tasks.push( { Format: "ICO (BMP)", UsePNG: false, FileExt: "ico", ConverterFnc: PNG2ICONS.createICO } );
} else if (outputFormat === "-icop") {
    Tasks.push( { Format: "ICO (PNG)", UsePNG: true, FileExt: "ico", ConverterFnc: PNG2ICONS.createICO } );
} else if (outputFormat === "-all") {
    Tasks.push( { Format: "ICNS", UsePNG: true, FileExt: "icns", ConverterFnc: PNG2ICONS.createICNS } );
    Tasks.push( { Format: "ICO (BMP)", UsePNG: false, FileExt: "ico", ConverterFnc: PNG2ICONS.createICO} );
} else if (outputFormat === "-allp") {
    Tasks.push( { Format: "ICNS", UsePNG: true, FileExt: "icns", ConverterFnc: PNG2ICONS.createICNS } );
    Tasks.push( { Format: "ICO (PNG)", UsePNG: true, FileExt: "ico", ConverterFnc: PNG2ICONS.createICO} );
} else { //??
    printUsage();
}

const inputFile: string = resolve(process.argv[2]);
const outputFileStub: string = resolve(process.argv[3]);
const input: Buffer = readFileSync(resolve(inputFile));
PNG2ICONS.setLogger(consoleLogger);

for (let i = 0; i < Tasks.length; i++) {
    const task = Tasks[i];
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
    if ((printInfo) && (Tasks.length > 1) && (i < Tasks.length-1)) {
        consoleLogger("");
    }
}
