import * as ExcelJS from 'exceljs';

export default function getValueForCellExcel(oValue: ExcelJS.CellValue): string | null {
    let sTmpValue = '';

    if (typeof oValue !== 'undefined') {
        if (oValue === null || oValue === undefined || typeof oValue === 'undefined') {
            sTmpValue = null;
        } else if (['number', 'string', 'boolean', 'Date'].includes(typeof oValue)) {
            sTmpValue = oValue.toString();
        } else if (typeof oValue === 'object') {
            if ('error' in oValue) {
                sTmpValue = null;
            } else if ('richText' in oValue) {
                sTmpValue = oValue.richText.map(oItem => oItem.text).join(' ');
            } else if ('text' in oValue) {
                sTmpValue = oValue.text;
            } else if ('result' in oValue) {
                sTmpValue = getValueForCellExcel(oValue.result);
            } else if (oValue instanceof Date) {
                sTmpValue = oValue.toISOString();
            }
        } else {
            sTmpValue = null;
        }
    } else {
        return null;
    }

    return typeof sTmpValue === 'string' ? sTmpValue.trim() : null;
}
