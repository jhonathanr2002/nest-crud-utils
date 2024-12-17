import {ArgumentsHost, BadRequestException, Catch, ExceptionFilter, HttpStatus} from '@nestjs/common';
import {
    BackendErrorException,
    Duration,
    getHttpCodeByError,
    getHttpStatusDescription,
    isResponseDto,
    ResponseDto,
    ResponseErrorDto,
    UserException,
} from 'nest-clean-response';
import {throwError} from 'rxjs';

@Catch()
export class ExceptionRcpFilter<T extends Error> implements ExceptionFilter {
    catch(oException: T, host: ArgumentsHost) {
        //const oReq: Request = ctx.getRequest<Request>();
        let oBackendError: BackendErrorException;

        const oErrorsResponse: Array<UserException> = [];

        if (isResponseDto(oException)) {
            return throwError(() => oException);
        } else if ((oException instanceof UserException)) {
            oErrorsResponse.push(oException);
            oBackendError = new BackendErrorException(HttpStatus.BAD_REQUEST, oException);
            oBackendError.startTime = oException.startTime;
        } else if (oException instanceof BackendErrorException) {
            oBackendError = oException;

            if (oBackendError.error) {
                if (oException.error instanceof BadRequestException) {
                    const oErros = oException.error.getResponse() as { message: Array<string> };

                    if (oErros.message && Array.isArray(oErros.message)) {
                        oErros.message.map((sValue: string) => {
                            return JSON.parse(sValue);
                        }).forEach((oItem: UserException) => {
                            oErrorsResponse.push(new UserException(oItem.property, oItem.messageCode, oItem.args));
                        });
                    }
                }
            }
        } else {
            oBackendError = new BackendErrorException(getHttpCodeByError(oException), oException);
        }

        if (oBackendError instanceof BackendErrorException) {
            return throwError(() => new ResponseDto<null>(
                oBackendError.getStatus(),
                getHttpStatusDescription(oBackendError.getStatus()),
                null,
                Duration.getDuration(oBackendError.startTime ?? null).toObject(),
                oErrorsResponse.map((oItem: UserException) => {
                    return new ResponseErrorDto(oItem.property, oItem.messageCode, oItem.args);
                }),
            ));
        } else {
            return throwError(() => new ResponseDto<null>(
                500,
                getHttpStatusDescription(500),
                null,
                Duration.getDuration(new Date().getTime()).toObject(),
                oErrorsResponse.map((oItem: UserException) => {
                    return new ResponseErrorDto(oItem.property, oItem.messageCode, oItem.args);
                }),
            ));
        }
    }
}
