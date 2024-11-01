export interface IExcelColumn {
    key: string;
    name: string;
    required: boolean;
    type: "String" | "Number" | "Double" | "Date",
    options: {
        presition?: number,
        width?: number
    }
}