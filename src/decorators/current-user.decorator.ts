import {createParamDecorator, ExecutionContext} from '@nestjs/common';

export function CurrentUser<T>() {
    type TFieldUser = keyof T;
    type TValuesUser = T[keyof T];
    return createParamDecorator((sField: TFieldUser, ctx: ExecutionContext): TValuesUser | T | null => {
        const oReq = ctx.switchToHttp().getRequest();
        const oUser = (oReq.user ?? null) as T | null;

        return sField ? oUser?.[sField] : oUser;
    })();
}

