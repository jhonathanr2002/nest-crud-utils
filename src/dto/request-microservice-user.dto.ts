import {Type} from 'class-transformer';
import {ValidateNested} from 'class-validator';
import {UserDto} from './user.dto';

export class RequestMicroserviceUser {
    @ValidateNested()
    @Type(() => UserDto)
    oUser: UserDto;
}
