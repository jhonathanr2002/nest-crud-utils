import {IsValidator} from 'nest-swagger-validator';

export class UserDto {
    @IsValidator({
        swaggerDocs: true,
        ruleType: 'string',
        stringOptions: {
            minLength: 0,
            maxLength: 255,
        },
    })
    id: string;

    @IsValidator({
        swaggerDocs: true,
        ruleType: 'string',
        stringOptions: {
            minLength: 0,
            maxLength: 255,
        },
    })
    username: string;
}
