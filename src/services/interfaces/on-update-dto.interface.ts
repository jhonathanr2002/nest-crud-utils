export interface OnUpdateWithDto<T, UD> {
    updateByIdWithDto(sId: string, oDto: UD): Promise<T>;
}