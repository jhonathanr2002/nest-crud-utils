import {Catch, Injectable, Scope, ExceptionFilter, ArgumentsHost} from '@nestjs/common';
import {HttpArgumentsHost} from '@nestjs/common/interfaces';
import {isResponseDto, ResponseDto} from 'nest-clean-response';
import {ExceptionsFilter} from './exceptions.filter';
import {Response} from 'express';

@Catch()
@Injectable({scope: Scope.REQUEST})
export class ExceptionResponseDtoFilter<T extends Error> extends ExceptionsFilter<T> implements ExceptionFilter {
    constructor() {
        super();
    }

    catch(oException: T, host: ArgumentsHost) {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const oRes: Response = ctx.getResponse<Response>();

        if (isResponseDto(oException)) {
            const oErrorProcess = oException as unknown as ResponseDto<null>;
            oRes.status(oErrorProcess.code).json(
                new ResponseDto<null>(
                    oErrorProcess.code,
                    oErrorProcess.messageCode,
                    oErrorProcess.result,
                    oErrorProcess.duration,
                    oErrorProcess.resultError,
                ),
            );
        } else {
            super.catch(oException, host);
        }
    }
}
