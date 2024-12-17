export interface OnAfterSave<T> {
    onAfterSave(oEntity: T): Promise<void>;
}