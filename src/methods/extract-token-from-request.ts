import {Request} from 'express';

export default function extractTokenFromHeader(oReq: Request) {
    const sToken: string = (oReq.headers['authorization'] || oReq.cookies.token || '').trim();

    if (sToken.length === 0) {
        return null;
    }

    if (sToken.startsWith('Bearer')) {
        const [type, token] = sToken.split(' ') ?? [];

        return type === 'Bearer' ? (token === 'undefined' ? null : token) : null;
    } else {
        return null;
    }
};