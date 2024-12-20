import {ArgumentsHost, BadRequestException, Catch, ExceptionFilter, HttpStatus} from '@nestjs/common';
import {HttpArgumentsHost} from '@nestjs/common/interfaces';
import {
    BackendErrorException,
    Duration,
    getHttpCodeByError,
    getHttpStatusDescription,
    ResponseDto,
    ResponseErrorDto,
    UserException,
} from 'nest-clean-response';
import {Response} from 'express';

@Catch()
export class ExceptionsFilter<T extends Error> implements ExceptionFilter {
    catch(exception: T, host: ArgumentsHost) {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const oRes: Response = ctx.getResponse<Response>();
        //const oReq: Request = ctx.getRequest<Request>();
        let oBackendError: BackendErrorException;
        const oErrorsResponse: Array<UserException> = [];

        if (exception instanceof ResponseDto) {
            oRes.status(exception.code).json(exception);
        } else if ((exception instanceof UserException)) {
            oErrorsResponse.push(exception);
            oBackendError = new BackendErrorException(HttpStatus.BAD_REQUEST, exception);
            oBackendError.startTime = exception.startTime;
        } else if (exception instanceof BackendErrorException) {
            oBackendError = exception;

            if (oBackendError.error) {
                if (exception.error instanceof BadRequestException) {
                    const oErrors = exception.error.getResponse() as { message: Array<string> };

                    if (oErrors.message && Array.isArray(oErrors.message)) {
                        oErrors.message.map((sValue: string) => {
                            return JSON.parse(sValue);
                        }).forEach((oItem: UserException) => {
                            oErrorsResponse.push(new UserException(oItem.property, oItem.messageCode, oItem.args));
                        });
                    }
                }
            }
        } else {
            oBackendError = new BackendErrorException(getHttpCodeByError(exception), exception);
        }

        if (oBackendError instanceof BackendErrorException) {
            oRes.status(oBackendError.getStatus()).json(
                new ResponseDto<null>(
                    oBackendError.getStatus(),
                    getHttpStatusDescription(oBackendError.getStatus()),
                    null,
                    Duration.getDuration(oBackendError.startTime ?? null).toObject(),
                    oErrorsResponse.map((oItem: UserException) => {
                        return new ResponseErrorDto(oItem.property, oItem.messageCode, oItem.args);
                    }),
                ),
            );
        } else {
            oRes.status(500).json(
                new ResponseDto<null>(
                    500,
                    getHttpStatusDescription(500),
                    null,
                    Duration.getDuration(new Date().getTime()).toObject(),
                    oErrorsResponse.map((oItem: UserException) => {
                        return new ResponseErrorDto(oItem.property, oItem.messageCode, oItem.args);
                    }),
                ),
            );
        }


    }
}
