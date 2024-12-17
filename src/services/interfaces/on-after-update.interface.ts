export interface OnAfterUpdate<T> {
    onAfterUpdate(oEntity: T): Promise<void>;
}