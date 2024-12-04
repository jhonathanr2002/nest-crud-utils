import {createParamDecorator, ExecutionContext} from '@nestjs/common';
import extractTokenFromHeader from '../methods/extract-token-from-request';

export const CurrentJwt = createParamDecorator((ctx: ExecutionContext): string => {
    const oReq = ctx.switchToHttp().getRequest();

    return extractTokenFromHeader(oReq);
});
