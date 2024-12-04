import {Request} from 'express';

export default function extractBasicAuthFromRequest(oReq: Request) {
    const sBasicAuth: string = (oReq.headers['authorization'] ?? '').trim();

    if (sBasicAuth.length === 0) {
        return null;
    }

    if (sBasicAuth.startsWith('Basic')) {
        const [type, base64Credentials] = sBasicAuth.split(' ') ?? [];

        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');

        return type === 'Basic' ? {
            username,
            password,
        } : null;
    } else {
        return null;
    }
};