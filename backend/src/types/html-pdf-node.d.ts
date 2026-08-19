declare module "html-pdf-node" {
  interface Options {
    format?: string;
    width?: string;
    height?: string;
    margin?: number | {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    printBackground?: boolean;
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    [key: string]: unknown;
  }

  interface File {
    content?: string;
    url?: string;
    path?: string;
  }

  function generatePdf(
    file: File,
    options?: Options,
  ): Promise<Buffer>;

  export { generatePdf, Options, File };
}