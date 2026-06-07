declare module "fit-file-parser" {
  export interface FitParserOptions {
    force?: boolean;
    speedUnit?: string;
    lengthUnit?: string;
    temperatureUnit?: string;
    elapsedRecordField?: boolean;
    mode?: string;
  }

  export default class FitParser {
    constructor(options?: FitParserOptions);
    parse(
      content: Buffer | ArrayBuffer | Uint8Array,
      callback: (error: unknown, data: unknown) => void,
    ): void;
  }
}
