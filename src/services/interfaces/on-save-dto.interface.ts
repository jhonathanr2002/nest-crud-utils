export interface OnSaveWithDto<T, CD> {
    saveWithDto(oDto: CD): Promise<T>;
}