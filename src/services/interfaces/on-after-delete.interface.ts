export interface OnAfterDelete {
    onAfterDelete(sId: string): Promise<void>;
}