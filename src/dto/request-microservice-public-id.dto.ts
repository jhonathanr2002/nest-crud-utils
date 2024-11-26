import { ValidateNested } from "class-validator";

export class RequestMicroservicePublicId {
	@ValidateNested()
	ids: Record<string, string>
}
