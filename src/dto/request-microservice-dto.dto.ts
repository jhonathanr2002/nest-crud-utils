import { RequestMicroserviceUser } from "./request-microservice-user.dto";

export class RequestMicroserviceDto<T> extends RequestMicroserviceUser {
	dto: T;
}
