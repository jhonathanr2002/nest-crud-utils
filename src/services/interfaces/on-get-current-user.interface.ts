import { UserDto } from "../../dto/user.dto";

export interface OnGetCurrentUser<D extends UserDto> {
    getCurrentUser(): Promise<D>;
}