import * as ExcelJS from 'exceljs';

export interface IExcelDownload {
    content: Buffer | ExcelJS.Buffer;
    name: string;
}
