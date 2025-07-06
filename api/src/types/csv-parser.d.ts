declare module 'csv-parser' {
  import { Transform } from 'stream';
  
  interface CsvParserOptions {
    separator?: string;
    quote?: string;
    escape?: string;
    headers?: boolean | string[];
    skipEmptyLines?: boolean;
    skipLinesWithError?: boolean;
    maxRowBytes?: number;
    strict?: boolean;
    raw?: boolean;
    mapHeaders?: (args: { header: string; index: number }) => string;
    mapValues?: (args: { header: string; index: number; value: string }) => string;
  }
  
  function csvParser(options?: CsvParserOptions): Transform;
  
  export = csvParser;
} 