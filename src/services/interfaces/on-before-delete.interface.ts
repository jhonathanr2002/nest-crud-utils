export interface OnBeforeDelete {
    onBeforeDelete(sId: string): Promise<void>;
}