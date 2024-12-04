import {ValidateNested} from 'class-validator';
import {RequestMicroserviceUser} from './request-microservice-user.dto';

export class RequestMicroserviceId extends RequestMicroserviceUser {
    @ValidateNested()
    ids: Record<string, string>;
}
