import { IsStringValidator, IsUuidValidator } from 'nest-swagger-validator';

export class UserDto {
    @IsUuidValidator('all', {
        swaggerDocs: false,
    })
    id: string;

    @IsStringValidator({
        swaggerDocs: false,
        minLength: 0,
        maxLength: 255,
    })
    username: string;
}
