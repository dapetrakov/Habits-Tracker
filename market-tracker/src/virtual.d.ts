declare module 'virtual:market-data' {
  import type { UpdateFile } from './lib/schema';
  export const files: { file: string; data: UpdateFile }[];
  export const isSample: boolean;
}
