import {UserDto} from "../../dto/user.dto";

export interface OnGetCurrentUser {
    getCurrentUser(): Promise<UserDto>;
}