import {ArgumentsHost, BadRequestException, Catch, ExceptionFilter, HttpStatus, Injectable, Scope} from '@nestjs/common';
import {HttpArgumentsHost} from '@nestjs/common/interfaces';
import {
    Duration,
    getHttpStatusDescription,
    ResponseDto,
    ResponseErrorDto,
    getHttpCodeByError,
    UserException,
    BackendErrorException,
} from 'nest-clean-response';
import {Response} from 'express';

@Catch()
@Injectable({scope: Scope.REQUEST})
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
                    const oErros = exception.error.getResponse() as { message: Array<string> };

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
            oBackendError = new BackendErrorException(getHttpCodeByError(exception), exception);
        }

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
    }
}
