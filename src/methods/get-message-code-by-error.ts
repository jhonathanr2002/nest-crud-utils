import { NotFoundException, UnauthorizedException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { BackendErrorException, isResponseDto, ResponseDto, ResponseEnum, ResponseErrorDto, UserException } from "nest-clean-response";

export default function getMessageCodeByError(oError: Error): ResponseEnum {
    if (isResponseDto(oError)) {
        return (oError as unknown as ResponseDto<unknown>).messageCode as ResponseEnum;
    } else if (oError instanceof NotFoundException) {
        return ResponseEnum.NOT_FOUND;
    } else if (oError instanceof ThrottlerException) {
        return ResponseEnum.TOO_MANY_REQUESTS;
    } else if (oError instanceof UnauthorizedException || oError.message === "jwt expired") {
        return ResponseEnum.UNAUTHORIZED;
    } else if (oError instanceof BackendErrorException) {
        return ResponseEnum.INTERNAL_SERVER_ERROR;
    } else if (oError instanceof BadRequestException || (oError instanceof UserException) || oError instanceof ResponseErrorDto) {
        return ResponseEnum.BAD_REQUEST;
    } else if (oError instanceof ForbiddenException) {
        return ResponseEnum.FORBIDDEN;
    } else if (oError && oError.message === "Timeout has occurred") {
        return ResponseEnum.GATEWAY_TIMEOUT;
    } else {
        console.error("ControllerError.getMessageCodeByError(oError)", oError);

        return ResponseEnum.UNKNOWN_ERROR;
    }
}
