export interface OnBeforeUpdate<D> {
    onBeforeUpdate(sId: string, oDto: D): Promise<void>;
}