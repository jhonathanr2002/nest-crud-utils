export interface OnBeforeSave<T> {
    onBeforeSave(oEntity: T): Promise<void>;
}